import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import SolanaPaymentProviderService from "./service";
import checkPaymentsJob from './jobs/check-payment';

export { checkPaymentsJob };

export default ModuleProvider(Modules.PAYMENT, {
  services: [SolanaPaymentProviderService],
});
