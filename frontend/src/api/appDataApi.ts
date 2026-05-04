import { backendApi } from "./backendApi";
import { getDataSource } from "./dataApi";
import { mockApi } from "./mockApi";

export const appDataApi = getDataSource() === "backend" ? backendApi : mockApi;
