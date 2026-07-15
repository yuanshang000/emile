# emile — 部署教程

邮件接收、自动分类、验证码提取与 API 服务（Cloudflare Workers + D1）。

## 前提条件

- 一个 GitHub 账号
- 一个 Cloudflare 账号，且**你的接收邮箱域名**已在 Cloudflare 管理
- Node.js 18+ 已安装（本地开发用）

> 注意区分两个概念：
> - **项目名**：`emile`，本代码仓库 / 产品名称
> - **接收邮箱域名**：你真正用来收邮件的域名（比如 `ysyxopq.eu.cc`），需要在 Cloudflare 上管理

---

## 第一步：创建或 Fork GitHub 仓库

**选项 A：创建新仓库**
1. 打开 https://github.com/new
2. **Repository name** 填写 `emile`（或其他名字）
3. 选 **Private** 或 **Public** 均可
4. 不要勾选 "Add a README"、"Add .gitignore" 等任何初始化选项
5. 点击 **Create repository**

**选项 B：Fork 已有仓库**
如果你是从已有仓库（如团队项目）开始，直接 Fork 到你的 GitHub 账号下即可。

创建/Fork 后会显示仓库页面，先留着后面会用到。

---

## 第二步：获取 Cloudflare API Token

GitHub Actions 需要凭据来操作 Cloudflare（创建 D1 数据库、部署 Worker 等）。

1. 打开 https://dash.cloudflare.com/profile/api-tokens
2. 点击 **Create Token**
3. 选择 **Start with a template** → **Edit Cloudflare Workers**
4. 在 **Permissions** 区域，确保有以下权限：
   - `Account > Cloudflare Workers > Edit`
   - `Account > D1 > Edit`
   - `Zone > Email Routing > Edit`（用于配置邮件路由）
5. 在 **Account Resources** 选择你的账号
6. 在 **Zone Resources** 选择你的**接收邮箱域名**
7. 点击 **Continue to Summary** → **Create Token**
8. **复制生成的 Token**（只会显示一次，务必保存好）

> **重要：** 如果 Token 权限不够，部署时会失败。如果遇到问题，可以回来添加更多权限。

---

## 第三步：在 GitHub 仓库设置 Secrets

1. 打开你的 GitHub 仓库页面（刚创建的那个）
2. 进入 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**，添加以下两个：

### Secret 1: `CLOUDFLARE_API_TOKEN`

| 字段 | 值 |
|------|-----|
| Name | `CLOUDFLARE_API_TOKEN` |
| Secret | 粘贴刚才复制的 Cloudflare API Token |

### Secret 2: `DOMAIN`

这个是你**用来接收邮件的域名**。部署后，Worker 会配置邮件路由规则 `*@你的域名`，所有发往该域名的邮件都会自动转发给 Worker 处理。

例如你的接收邮箱域名是 `ysyxopq.eu.cc`，那就填 `ysyxopq.eu.cc`。

| 字段 | 值 |
|------|-----|
| Name | `DOMAIN` |
| Secret | 你的接收邮箱域名，如 `ysyxopq.eu.cc` |

> 这个域名和项目名（`emile`）无关，填你实际用来收邮件的那个域名。不设置的话默认是 `yourdomain.com`，邮件路由会指向错误的域名。**必须设置。**

添加完成后应该能看到两个 Secrets：

```
CLOUDFLARE_API_TOKEN  ●●●●●●●●●●●●
DOMAIN                ysyxopq.eu.cc
```

---

## 第四步：查看部署进度

1. 在 GitHub 仓库页面，点击顶部 **Actions** 标签
2. 你会看到一个正在运行（或刚刚触发）的 workflow：**"Deploy to Cloudflare"**
3. 点击它可以看到实时日志

部署过程会依次执行：

```
✅ Checkout 代码
✅ 安装 API 依赖 (cf/)
✅ 安装前端依赖 (client/)
✅ 构建前端 (client/ → client/dist)
✅ 复制前端到 cf/dist
✅ 创建 D1 数据库（如果不存在）
✅ 获取 database_id 并生成 wrangler.toml
✅ 运行 D1 数据库迁移（建表）
✅ 部署 Worker（API + 前端页面）
```

**整个流程大约需要 2-5 分钟。**

如果某个步骤失败，展开该步骤查看错误信息。常见原因：
- `CLOUDFLARE_API_TOKEN` 权限不够 → 去 Cloudflare 修改 Token 权限
- D1 创建失败 → 确认账号已开通 D1（Workers 免费计划包含 D1）

---

## 第五步：验证部署

部署成功后，访问以下地址验证（Worker 名默认为 `manyme-api`，以你 Cloudflare 控制台实际名称为准）：

### Worker API 健康检查
```
https://manyme-api.你的用户名.workers.dev/api/health
```

预期返回：
```json
{ "status": "ok", "timestamp": "2026-07-15T..." }
```

### 前端页面
```
https://manyme-api.你的用户名.workers.dev
```

浏览器中应该能打开管理界面。

---

## 第六步：配置 Cloudflare Email Routing（最关键的一步）

部署完成后，Worker 已经能处理邮件了。现在需要告诉 Cloudflare 把你的接收邮箱域名的邮件转发给这个 Worker。

### 6.1 进入 Email Routing

1. 打开 https://dash.cloudflare.com
2. 选择你的**接收邮箱域名**
3. 进入 **Email** → **Email Routing**
4. 如果提示 "Enable Email Routing"，点击启用

### 6.2 设置目标地址

在 **Destination addresses** 区域：
1. 添加你的邮箱（用于接收邮件），验证它

### 6.3 创建 Catch-All 路由规则

在 **Routing rules** 区域：
1. 点击 **Create rule**
2. **Rule name**: `Catch-All → Worker`
3. **Catch-all action**: 选择 **Send to Worker**
4. **Worker**: 选择 `manyme-api`（或你部署后的 Worker 名称）
5. 点击 **Save**

> 如果你希望只处理特定子地址的邮件，可以把规则改为自定义匹配：
> - **Custom** → **Matches** → `verify@`、`noreply@` 等

### 6.4 确认 DNS 记录

Email Routing 通常会自动添加 MX 记录。在 **Email** → **Email Routing** → **DNS records** 确认：

| Type | Name | Priority | Target |
|------|------|----------|--------|
| MX | @ | 10 | `route1.mx.cloudflare.net` |
| MX | @ | 20 | `route2.mx.cloudflare.net` |
| TXT | @ | - | `v=spf1 include:_spf.mx.cloudflare.net ~all` |

如果已自动添加，无需手动操作。

---

## 日常使用

### 查看收到的邮件

部署并配置好 Email Routing 后，任何发往 `任意地址@你的接收邮箱域名` 的邮件都会：
1. 被 Cloudflare Email Routing 接收
2. 转发到你的 Worker
3. Worker 自动分类、提取验证码
4. 存储在 D1 数据库中

然后你可以通过 API 获取：
```
GET https://manyme-api.你的用户名.workers.dev/api/codes/latest?group=分组ID
```

或者打开前端页面查看和管理。

### 重新部署

每次推送到 `main` / `master` 分支，GitHub Actions 会自动重新部署：
```bash
git add .
git commit -m "xxx"
git push
```

---

## 常见问题

### Q: 部署失败，提示 "CLOUDFLARE_API_TOKEN is not set"
A: 忘记在 GitHub Secrets 中设置 `CLOUDFLARE_API_TOKEN`。回第三步确认。

### Q: 部署失败，提示 "D1 database creation failed"
A: 你的 Cloudflare 账号可能未开通 D1。检查 Workers 计划是否包含 D1（免费计划包含）。

### Q: 部署成功，但访问 workers.dev 返回 404
A: 检查 Cloudflare Dashboard → Workers & Pages → 你的 Worker → Triggers，确认路由配置；并确认已注册 workers.dev 子域名。

### Q: 收到的邮件没有被处理
A: 最常见原因是 Email Routing 没有正确配置。检查：
1. Email Routing 是否已启用
2. Catch-All 规则是否指向了正确的 Worker
3. DNS MX 记录是否生效（可能需要等待几分钟）
4. `DOMAIN` secret 是否填对了你的**接收邮箱域名**

### Q: 如何清空数据？
```bash
cd cf
npx wrangler d1 execute manyme-db --command "DELETE FROM emails; DELETE FROM groups;" --remote
```

---

## 本地开发

```bash
# 安装依赖
cd cf && npm install
cd ../client && npm install

# 启动 API（使用本地 D1）
cd ../cf
npx wrangler dev

# 另开终端，启动前端
cd ../client
npm run dev
```

前端开发服务器会代理 `/api` 请求到本地 Worker（`localhost:8787`）。
