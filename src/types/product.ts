export interface ProductSpecification {
  [key: string]: string | number | boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  price: number;
  image: string;
  tags: string[];
  useCases: string[];
  specifications: ProductSpecification;
  compatibleWith: string[];
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
}

export interface Store {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  distance: string;
  availableStockCount: number;
  phone: string;
  hours: string;
}
