/**
 * Example of an API endpoint to check Solana payment status
 * This would be implemented in your Medusa backend or a custom API
 * 
 * For Next.js API routes, this could be placed in pages/api/payments/solana/status/[id].js
 * For Express.js, this would be a route like app.get('/api/payments/solana/status/:id', ...)
 */

// Next.js API route example
export default async function handler(req, res) {
  const { id } = req.query;

  try {
    // Get the payment session from Medusa
    const medusaResponse = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/payment-sessions/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!medusaResponse.ok) {
      return res.status(medusaResponse.status).json({ 
        error: "Failed to fetch payment session" 
      });
    }

    const { payment_session } = await medusaResponse.json();

    // If the payment provider is not Solana, return an error
    if (payment_session.provider_id !== "solana") {
      return res.status(400).json({ 
        error: "Not a Solana payment session" 
      });
    }

    // Return the payment status
    return res.status(200).json({
      id: payment_session.id,
      status: payment_session.status,
      data: payment_session.data,
    });
  } catch (error) {
    console.error("Error checking Solana payment status:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
}

/**
 * Express.js route example
 */
/*
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/api/payments/solana/status/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Get the payment session from Medusa
    const medusaResponse = await axios.get(
      `${process.env.MEDUSA_BACKEND_URL}/store/payment-sessions/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const { payment_session } = medusaResponse.data;

    // If the payment provider is not Solana, return an error
    if (payment_session.provider_id !== "solana") {
      return res.status(400).json({ 
        error: "Not a Solana payment session" 
      });
    }

    // Return the payment status
    return res.status(200).json({
      id: payment_session.id,
      status: payment_session.status,
      data: payment_session.data,
    });
  } catch (error) {
    console.error("Error checking Solana payment status:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
});

module.exports = router;
*/
