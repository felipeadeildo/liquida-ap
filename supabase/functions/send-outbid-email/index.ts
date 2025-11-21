import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface OutbidEmailPayload {
  to: string;
  userName: string;
  itemTitle: string;
  itemUrl: string;
  newBidValue: number;
  newBidderName: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Parse request body
    const payload: OutbidEmailPayload = await req.json();
    const { to, userName, itemTitle, itemUrl, newBidValue, newBidderName } = payload;

    // Validate required fields
    if (!to || !userName || !itemTitle || !itemUrl || !newBidValue || !newBidderName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if Resend API key is configured
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format currency
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(newBidValue);

    // Get first name
    const firstName = userName.split(" ")[0];

    // HTML email template
    const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Você foi superado!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">
                ⚡ Você foi superado!
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 24px;">
              <p style="margin: 0 0 16px; font-size: 16px; color: #374151; line-height: 1.5;">
                Olá <strong>${firstName}</strong>,
              </p>

              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.5;">
                <strong>${newBidderName}</strong> deu um lance de <strong style="color: #8b5cf6; font-size: 20px;">${formattedValue}</strong> no item <strong>"${itemTitle}"</strong> que você estava liderando.
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0; border-radius: 4px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  ⚠️ <strong>Atenção:</strong> Você não é mais o líder deste leilão!
                </p>
              </div>

              <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.5;">
                Não perca tempo! Dê um novo lance para voltar à liderança.
              </p>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 8px 0;">
                    <a href="${itemUrl}" style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(139, 92, 246, 0.3);">
                      Dar Novo Lance →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; font-size: 14px; color: #6b7280;">
                Você está recebendo este email porque ativou notificações para este item.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © ${new Date().getFullYear()} Liquida AP. Todos os direitos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Plain text version
    const textBody = `
Olá ${firstName},

${newBidderName} deu um lance de ${formattedValue} no item "${itemTitle}" que você estava liderando.

⚠️ Você não é mais o líder deste leilão!

Não perca tempo! Dê um novo lance para voltar à liderança:
${itemUrl}

---
Você está recebendo este email porque ativou notificações para este item.
© ${new Date().getFullYear()} Liquida AP. Todos os direitos reservados.
    `.trim();

    // Send email via Resend API (official method for Edge Functions)
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Liquida AP <noreply@updates.insper.dev>",
        to: [to],
        subject: `⚡ Você foi superado no leilão: ${itemTitle}`,
        html: htmlBody,
        text: textBody,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", data);

    return new Response(
      JSON.stringify(data),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        }
      }
    );

  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
