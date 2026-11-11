import { catalog } from "../../content/estatua";
import { portraitCatalog } from "../../content/quadros";
import type { ItemConfig, ProductType } from "./tipos";

export const productType = (config: ItemConfig): ProductType => config.productType ?? "escultura";
export const productLabel = (config: ItemConfig): string => config.productType === "quadro" ? "Quadro personalizado" : "Escultura 3D";

/** Copia somente as escolhas, sem dados do pedido ou campos enviados pelo cliente. */
export function itemConfigOf(config: ItemConfig): ItemConfig {
  return config.productType === "quadro" ? {
    productType: "quadro", sizeId: config.sizeId, styleId: config.styleId, frameId: config.frameId, petName: config.petName,
  } : {
    ...(config.productType ? { productType: config.productType } : {}),
    sizeId: config.sizeId, poseId: config.poseId, colorId: config.colorId, petName: config.petName,
  };
}

/** Resumo compartilhado pelo carrinho, pedido, WhatsApp e painel. */
export function productDetails(config: ItemConfig): string {
  if (config.productType === "quadro") {
    return [
      portraitCatalog.sizes.find((s) => s.id === config.sizeId)?.label ?? config.sizeId,
      portraitCatalog.styles.find((s) => s.id === config.styleId)?.label ?? config.styleId,
      `Moldura ${portraitCatalog.frames.find((f) => f.id === config.frameId)?.label.toLowerCase() ?? config.frameId}`,
    ].join(" · ");
  }
  return [
    catalog.sizes.find((s) => s.id === config.sizeId)?.label ?? config.sizeId,
    catalog.poses.find((p) => p.id === config.poseId)?.label ?? config.poseId,
    catalog.colors.find((c) => c.id === config.colorId)?.label ?? config.colorId,
  ].join(" · ");
}

export const productCatalogVersion = (config: ItemConfig): string =>
  config.productType === "quadro" ? portraitCatalog.version : catalog.version;
