"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easterHtmlContent = void 0;
const easterHtmlContent = (code, percentage) => {
    return `
  <!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8">
  <title>Velikonoční kód</title>
  <style>
    @media screen {
      .code-container {
        position: relative;
        text-align: center;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      }
      .code-text {
        background-color: #f3fa9b; 
        color: #5faf46;
        border: 2px solid #5faf46; 
        padding: 10px 25px;
        font-size: 18px;
        font-family: Arial, sans-serif;
        font-weight: bold;
        border-radius: 50px;
        text-decoration: none;
        display: inline-block;
        text-align: center;
        margin-top: 20px;
        margin-bottom: 20px;
      }
    }
    .footer {
      font-family: Arial, sans-serif;
      font-size: 14px;
      color: #444;
      text-align: center;
      padding: 20px 10px;
    }
    .footer a {
      color: #444;
      text-decoration: none;
    }
    .social-icons {
      margin: 10px 0;
    }
    .social-icons img {
      margin: 0 5px;
      vertical-align: middle;
    }
  </style>
</head>
<body style="Margin:0;padding:0;background:#ffffff;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center">
    <tr>
      <td align="center" style="padding:0;">

        <!-- Email content wrapper -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto;">
          <tr>
            <td align="center" valign="top" style="position: relative;">

              <!-- Image + code -->
              <div class="code-container" style="position: relative; display: inline-block; text-align: center;">
                <img src="https://cdn.shopify.com/s/files/1/0625/1026/8645/files/Velikonoce_e-mail-automat_2.png?v=1744779377" alt="Velikonoce" width="100%" style="max-width: 600px; width: 100%; display: block;">

                <!-- Unique code -->
                <div class="code-wrapper" style="background-color: #029d78">
                  <div class="code-text" style="
                    background-color: #f3fa9b; 
                    color: #5faf46;
                    border: 2px solid #5faf46; 
                    padding: 10px 25px;
                    font-size: 18px;
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                    border-radius: 50px;
                    text-decoration: none;
                    display: inline-block;
                    text-align: center;
                    margin-top: 20px;
                    margin-bottom: 20px;
                  ">
                    ${code}
                  </div>
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center">
              <div class="footer">
                <p>Pokud máte jakékoliv dotazy, neváhejte nás kontaktovat na <a href="mailto:info@yeskrabicky.cz">info@yeskrabicky.cz</a>.</p>
                <div class="social-icons">
                  <a href="https://www.facebook.com/yeskrabicky.cz" target="_blank">
                    <img src="https://cdn.shopify.com/s/files/1/0625/1026/8645/files/mail-fb-icon.png" alt="Facebook" width="28" />
                  </a>
                  <a href="https://www.instagram.com/yeskrabicky.cz" target="_blank">
                    <img src="https://cdn.shopify.com/s/files/1/0625/1026/8645/files/mail-ig-icon.png" alt="Instagram" width="28" />
                  </a>
                  <a href="https://www.yeskrabicky.cz" target="_blank">
                    <img src="https://cdn.shopify.com/s/files/1/0625/1026/8645/files/mail-web-icon.png" alt="Web" width="28" />
                  </a>
                </div>
                <p>Copyright © RR food delivery s.r.o., Všechna práva vyhrazena.</p>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
};
exports.easterHtmlContent = easterHtmlContent;
