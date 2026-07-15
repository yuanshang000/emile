/**
 * Cloudflare Email Worker
 * 
 * 部署方式：
 * 1. 在 Cloudflare Dashboard 创建 Worker
 * 2. 将此代码粘贴到 Worker 中
 * 3. 在 Email Routing 中设置规则：将域名邮件路由到此 Worker
 * 4. 在 Worker 环境变量中设置 API_URL 指向你的 Node.js 服务地址
 * 
 * 环境变量：
 * - API_URL: Node.js 服务地址，如 https://your-server.com
 * - API_TOKEN: (可选) 鉴权 Token
 */

export default {
  async email(message, env, ctx) {
    const { from, to, headers } = message;

    const subject = headers.get('subject') || '';
    let bodyText = '';
    let bodyHtml = '';

    // 读取邮件内容
    if (message.text) {
      bodyText = await message.text();
    }
    if (message.html) {
      bodyHtml = await message.html();
    }

    // 构造要发送的数据
    const payload = {
      message_id: headers.get('message-id') || headers.get('Message-ID') || '',
      from: from,
      to: to,
      subject: subject,
      body_text: bodyText,
      body_html: bodyHtml,
    };

    // 转发到 Node.js API
    const apiUrl = env.API_URL || 'http://localhost:3001';
    const headersObj = {
      'Content-Type': 'application/json',
    };

    if (env.API_TOKEN) {
      headersObj['Authorization'] = `Bearer ${env.API_TOKEN}`;
    }

    try {
      const response = await fetch(`${apiUrl}/api/webhook/email`, {
        method: 'POST',
        headers: headersObj,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error(`API error: ${response.status} ${await response.text()}`);
      } else {
        const result = await response.json();
        console.log('Email processed:', JSON.stringify(result));
      }
    } catch (err) {
      console.error('Failed to forward email:', err);
    }
  },
};
