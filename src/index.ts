import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import SolanaPaymentProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [SolanaPaymentProviderService],
});
