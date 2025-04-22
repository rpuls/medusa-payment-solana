// src/jobs/check-payments.ts
import { MedusaContainer } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import SolanaPaymentProviderService from '../modules/solana-payment/service';

export default async function checkPaymentsJob(container: MedusaContainer) {
  const logger = container.resolve('logger')
  const paymentModuleService = container.resolve(Modules.PAYMENT)
  const solanaPaymentProvider = container.resolve('solana') as SolanaPaymentProviderService;

  try {
    // Get pending payment sessions that need status checking
    const paymentSessions = await paymentModuleService.listPaymentSessions({
      provider_id: 'pp_solana_solana',
    })

    // Then filter them by status
    const pendingPaymentSessions = paymentSessions.filter(paymentSession => paymentSession.status === 'pending')

    logger.info(`Checking status for ${pendingPaymentSessions.length} pending payment sessions`)

    for (const paymentSession of pendingPaymentSessions) {
      try {
        const statusResult = await solanaPaymentProvider.getPaymentStatus({ data: paymentSession.data })
        
        // Update payment session status based on the API response
        if (statusResult.status === 'authorized') {
          // First authorize the payment session
          const payment = await paymentModuleService.authorizePaymentSession(paymentSession.id, {})
          
          // Then capture the payment immediately, since crypto transactions does not distinguish between authorized and captured - they are both authorized and captured when completed
          if (payment) {
            await paymentModuleService.capturePayment({
              payment_id: payment.id,
            })
            logger.info(`Payment ${payment.id} successfully captured`)
          }
        } else if (statusResult.status === 'error') {
          // Handle failed payment session
          // Update the session status accordingly
        }
      } catch (err) {
        logger.error(`Error processing payment session ${paymentSession.id}: ${err}`)
      }
    }
  } catch (error) {
    logger.error(`Error in check payments job: ${error}`)
  }
}