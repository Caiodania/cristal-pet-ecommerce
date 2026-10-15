// Armazenamento de arquivos (fotos dos clientes, imagens geradas e arquivos
// 3D). Duas implementações: memória (testes e desenvolvimento) e Supabase
// Storage (produção, bucket PRIVADO). O navegador só recebe links assinados e
// temporários, nunca o caminho do arquivo.

import { createClient } from "@supabase/supabase-js";
import { signToken, verifyToken } from "../crypto";

export interface FileStore {
  readonly kind: "memory" | "supabase";
  put(path: string, bytes: Uint8Array, contentType: string): Promise<void>;
  get(path: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  /** Link temporário. Com `downloadName`, o navegador baixa o arquivo com esse nome. */
  signedUrl(path: string, ttlSeconds: number, opts?: { downloadName?: string }): Promise<string>;
  /** Só a versão em memória: atende `GET /api/files/:token`. */
  serve?(token: string): Promise<Response | null>;
}

export function createMemoryFileStore(secret: string): FileStore {
  const files = new Map<string, { bytes: Uint8Array; contentType: string }>();

  return {
    kind: "memory",

    async put(path, bytes, contentType) {
      files.set(path, { bytes: new Uint8Array(bytes), contentType });
    },

    async get(path) {
      const file = files.get(path);
      return file ? { bytes: new Uint8Array(file.bytes), contentType: file.contentType } : null;
    },

    async signedUrl(path, ttlSeconds, opts) {
      const token = signToken(
        { p: path, dl: opts?.downloadName, exp: Math.floor(Date.now() / 1000) + ttlSeconds },
        secret,
      );
      return `/api/files/${token}`;
    },

    async serve(token) {
      const payload = verifyToken<{ p: string; dl?: string }>(token, secret);
      if (!payload) return null;
      const file = files.get(payload.p);
      if (!file) return null;
      const headers: Record<string, string> = {
        "Content-Type": file.contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
        // SVG da demonstração: sem script, sem recurso externo, mesmo se abrirem direto.
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      };
      if (payload.dl) {
        headers["Content-Disposition"] = `attachment; filename="${payload.dl.replace(/[^\w.-]/g, "_")}"`;
      }
      return new Response(file.bytes as BodyInit, { headers });
    },
  };
}

export function createSupabaseFileStore(url: string, serviceKey: string, bucket: string): FileStore {
  const storage = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(bucket);

  return {
    kind: "supabase",

    async put(path, bytes, contentType) {
      const { error } = await storage.upload(path, bytes, { contentType, upsert: true });
      if (error) throw new Error(`Falha ao gravar arquivo (${error.message}).`);
    },

    async get(path) {
      const { data, error } = await storage.download(path);
      if (error || !data) return null;
      return {
        bytes: new Uint8Array(await data.arrayBuffer()),
        contentType: data.type || "application/octet-stream",
      };
    },

    async signedUrl(path, ttlSeconds, opts) {
      const { data, error } = await storage.createSignedUrl(
        path,
        ttlSeconds,
        opts?.downloadName ? { download: opts.downloadName } : undefined,
      );
      if (error || !data) throw new Error(`Falha ao assinar link (${error?.message}).`);
      return data.signedUrl;
    },
  };
}
