// Product lookup via Open Food Facts API
export interface ProductInfo {
  name: string;
  brand: string;
  image: string;
  quantity: string;
  found: boolean;
}

export async function lookupProduct(code: string): Promise<ProductInfo> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!response.ok) {
      return { name: '', brand: '', image: '', quantity: '', found: false };
    }
    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return { name: '', brand: '', image: '', quantity: '', found: false };
    }
    const p = data.product;
    return {
      name: p.product_name || p.product_name_en || '',
      brand: p.brands || '',
      image: p.image_front_small_url || p.image_url || '',
      quantity: p.quantity || '',
      found: true,
    };
  } catch {
    return { name: '', brand: '', image: '', quantity: '', found: false };
  }
}
