"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.easterHtmlContent = void 0;
const easterHtmlContent = (code, percentage) => {
    return `
  <!DOCTYPE html>
<html lang="cs">
<head>
  <meta charset="UTF-8" />
  <title>Vaše sleva je připravena!</title>
  <style>
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      background-color: #f9f9f9;
      color: #333;
      padding: 0;
      margin: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    .header {
      background-color: #fdd835;
      padding: 30px;
      text-align: center;
      position: relative;
    }
    .header h1 {
      margin: 0;
      font-size: 21px;
      color: #000;
    }
    .eggs {
      margin-top: 10px;
    }
    .eggs img {
      margin: 0 6px;
      vertical-align: middle;
    }
    .content {
      padding: 30px;
      text-align: center;
    }
    .content p {
      font-size: 16px;
      line-height: 1.3;
    }
    .code {
      margin: 20px 0;
      font-size: 21px;
      font-weight: bold;
      background: #eee;
      display: inline-block;
      padding: 12px 24px;
      border-radius: 8px;
      letter-spacing: 2px;
      color: #d32f2f;
    }
    .footer {
      font-size: 14px;
      color: #888;
      text-align: center;
      padding: 20px;
    }
    .social-icons a, .code-link {
      text-decoration: none;
    }
    .social-icons img {
      margin: 4px;
      padding: 4px;
    }
    .code-link {
      color: #d32f2f;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🐰 Velikonoční nadílka právě dorazila!</h1>
      <div class="eggs">
        <img src="https://cdn.shopify.com/s/files/1/0783/9960/2973/files/Velikonocni-vajicka_2.png" alt="vajíčko 1" width="50" />
        <img src="https://cdn.shopify.com/s/files/1/0783/9960/2973/files/Velikonocni-vajicka_3.png" alt="vajíčko 2" width="50" />
        <img src="https://cdn.shopify.com/s/files/1/0783/9960/2973/files/Velikonocni-vajicka_5.png" alt="vajíčko 3" width="50" />
      </div>
    </div>
    <div class="content">
      <p>Děkujeme, že jste se zapojili do naší soutěže!</p>
      <p>Zde je Váš <strong>unikátní slevový kód</strong> na <strong>${percentage} %</strong>:</p>
      <a href="https://www.yeskrabicky.cz" target="_blank" class="code-link">
        <div class="code">${code}</div>
      </a>
      <p>Slevu uplatníte na pokladně při dokončení objednávky na <a href="https://www.yeskrabicky.cz" target="_blank">yeskrabicky.cz</a>.</p>
    </div>
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
  </div>
</body>
</html>
  `;
};
exports.easterHtmlContent = easterHtmlContent;
