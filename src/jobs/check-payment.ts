import { MedusaError } from '@medusajs/framework/utils'
import { MedusaContainer } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { capturePaymentWorkflow } from '@medusajs/medusa/core-flows'

export default async function checkPaymentsJob(container: MedusaContainer) {
  const logger = container.resolve('logger')
  logger.info('Running check payments job')
  
  const paymentModuleService = container.resolve(Modules.PAYMENT)
  
  const SolanaPaymentSessions = await paymentModuleService.listPaymentSessions({
    provider_id: 'pp_solana_solana',
  })
  const pendingPaymentSessions = SolanaPaymentSessions.filter(paymentSession => paymentSession.status === 'pending')

  for (const session of pendingPaymentSessions) {
    try {
      // Check for authorization status of the payment session. This will trigger authorizePayment in service.ts that checks against the blockchain. Error is thrown if not authorized yet.
      const payment = await paymentModuleService.authorizePaymentSession(session.id, {})
      
      // If we get here, authorization succeeded, so capture the payment
      await capturePaymentWorkflow(container).run({
        input: {
          payment_id: payment.id
        }
      })
      
      logger.info(`Successfully captured payment for session ${session.id}`)
    } catch (error) {
      const medusaError = error as MedusaError;
      if (medusaError.type === 'not_allowed' && 
        medusaError.message.includes('was not authorized with the provider')) {
        logger.info(`Payment session ${session.id} not yet ready for authorization`)
      } else {
        logger.error(`Error processing payment session ${session.id}: ${medusaError.message}`)
      }
    }
  }
}
