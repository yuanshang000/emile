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

---

## 邮箱库（Email Library）

邮箱库功能允许你管理一组**固定邮箱**，每个分类有独立的 API 端点，每次调用按顺序返回一个邮箱，循环使用。

### 适用场景

- 你有多个邮箱账号，需要轮流使用（注册、验证等）
- 每个场景（分类）需要独立的邮箱池
- 需要 API 方式按顺序获取下一个可用邮箱

### 快速开始（UI 操作）

1. 打开前端页面，点击顶部导航 **邮箱库**
2. 在顶部输入框输入分类名（如"谷歌注册"），点击 **新增分类**
3. 展开分类，在文本框中填入邮箱（**一行一个**），点击 **保存邮箱**
4. 点击 **API 获取** 测试按顺序获取邮箱
5. 点击 **复制 API** 获取该分类的 API 地址

### API 参考

所有端点前缀：`/api/email-lib`

#### 1. 获取所有分类（含统计）

```
GET /api/email-lib/categories
```

响应示例：
```json
[
  {
    "id": "a852f5c8-207d-4b69-ad01-edb56bc3cd0d",
    "name": "谷歌注册",
    "created_at": "2026-07-24 15:50:32",
    "updated_at": "2026-07-24 15:50:32",
    "emails": [
      {
        "id": "27a17ffe-ea17-4879-a3f0-941062014e0e",
        "category_id": "a852f5c8-...",
        "email": "user1@gmail.com",
        "sort_order": 0,
        "created_at": "2026-07-24 15:50:37"
      }
    ],
    "current_index": 1,
    "total": 3
  }
]
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 分类唯一 ID |
| `name` | string | 分类名称 |
| `emails` | array | 该分类下的所有邮箱 |
| `current_index` | number | 当前指针位置（下一个会返回这个索引的邮箱） |
| `total` | number | 邮箱总数 |

#### 2. 创建分类

```
POST /api/email-lib/categories
Content-Type: application/json

{"name": "谷歌注册"}
```

响应：`201 Created`
```json
{
  "id": "a852f5c8-207d-4b69-ad01-edb56bc3cd0d",
  "name": "谷歌注册",
  "created_at": "2026-07-24 15:50:32",
  "updated_at": "2026-07-24 15:50:32"
}
```

#### 3. 重命名分类

```
PUT /api/email-lib/categories/:id
Content-Type: application/json

{"name": "新分类名"}
```

#### 4. 删除分类

```
DELETE /api/email-lib/categories/:id
```

响应：`200 OK`
```json
{"success": true}
```

> 注意：删除分类会**级联删除**该分类下的所有邮箱和指针状态，不可恢复。

#### 5. 获取分类下的邮箱列表

```
GET /api/email-lib/categories/:id/emails
```

#### 6. 批量设置邮箱（替换全部）

```
PUT /api/email-lib/categories/:id/emails
Content-Type: application/json

{"emails": ["user1@gmail.com", "user2@gmail.com", "user3@gmail.com"]}
```

> **注意：** 此操作会**替换该分类下的全部邮箱**，原有的邮箱数据将被删除。同时**自动重置指针到 0**。

#### 7. ⭐ 按顺序获取下一个邮箱（核心 API）

```
GET /api/email-lib/next/:categoryId
```

响应示例：
```json
{
  "email": "user1@gmail.com",
  "index": 0,
  "total": 3
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `email` | string | 当前返回的邮箱地址 |
| `index` | number | 该邮箱在列表中的位置（从 0 开始） |
| `total` | number | 该分类下邮箱总数 |

**行为说明：**
- 按 `sort_order`（即录入顺序）**从小到大**依次返回
- 每次调用指针 **+1**
- 到达末尾后**自动回到 0**（循环）
- 如果该分类下没有邮箱，返回 `404`

**调用示例（4 次连续调用）：**
```
GET /next/分类ID  → {"email":"a@test.com","index":0,"total":3}
GET /next/分类ID  → {"email":"b@test.com","index":1,"total":3}
GET /next/分类ID  → {"email":"c@test.com","index":2,"total":3}
GET /next/分类ID  → {"email":"a@test.com","index":0,"total":3}  ← 回到开头
```

#### 8. 重置指针

```
POST /api/email-lib/categories/:id/reset
```

将指针重置为 0，下次调用 `next` 会从第一个邮箱开始返回。

### 集成示例

#### cURL
```bash
# 获取下一个邮箱
curl -s "https://your-worker.workers.dev/api/email-lib/next/分类ID"

# 批量获取并消费（伪代码）
EMAIL=$(curl -s "https://your-worker.workers.dev/api/email-lib/next/分类ID" | jq -r '.email')
echo "使用邮箱: $EMAIL"
# ... 用这个邮箱去注册/登录 ...
```

#### Python
```python
import requests

API_BASE = "https://your-worker.workers.dev"
CATEGORY_ID = "你的分类ID"

def get_next_email():
    resp = requests.get(f"{API_BASE}/api/email-lib/next/{CATEGORY_ID}")
    data = resp.json()
    return data["email"]  # 例如 "user1@gmail.com"

# 每次调用获得一个不同的邮箱，循环使用
email = get_next_email()
print(f"使用邮箱: {email}")
```

#### JavaScript / Node.js
```javascript
const API_BASE = "https://your-worker.workers.dev";
const CATEGORY_ID = "你的分类ID";

async function getNextEmail() {
  const res = await fetch(`${API_BASE}/api/email-lib/next/${CATEGORY_ID}`);
  const data = await res.json();
  return data.email;
}

// 使用
getNextEmail().then(email => console.log("使用邮箱:", email));
```

#### 自动化脚本（循环使用）
```bash
#!/bin/bash
# 每次调用获取一个邮箱，配合注册流程使用
CATEGORY_ID="你的分类ID"
API="https://your-worker.workers.dev/api/email-lib/next/$CATEGORY_ID"

for i in {1..10}; do
  EMAIL=$(curl -s "$API" | jq -r '.email')
  echo "[$i] 获取邮箱: $EMAIL"
  # 在这里执行你的注册/验证逻辑
  sleep 1
done
```

### 数据存储说明

| 表名 | 用途 |
|------|------|
| `email_lib_categories` | 分类（名称、创建/更新时间） |
| `email_lib_entries` | 邮箱条目（邮箱地址、所属分类、排序序号） |
| `email_lib_state` | 指针状态（每个分类当前的位置索引） |

- 删除分类时，其下的邮箱和指针状态**自动级联删除**
- 替换邮箱时，指针**自动重置为 0**
- 指针持久化存储在数据库，服务重启不会丢失进度

### 前端页面功能一览

| 操作 | 位置 | 说明 |
|------|------|------|
| 新增分类 | 顶部输入框 + 按钮 | 输入名称后创建 |
| 展开/收起 | ▶ 箭头 | 展开后编辑邮箱列表 |
| 重命名 | 分类右侧「重命名」按钮 | 修改分类名称 |
| 删除 | 分类右侧「删除」按钮 | 删除分类及所有邮箱 |
| 保存邮箱 | 展开后的文本框 +「保存邮箱」按钮 | 一行一个，替换全部 |
| API 获取 | 分类右侧「API 获取」按钮 | 测试调用 next API |
| 复制 API | 分类右侧「复制 API」按钮 | 复制该分类的 API 地址 |
| 重置 | 分类右侧「重置」按钮 | 重置指针到 0 |
| 复制结果 | 绿色提示框内「复制」按钮 | 复制最近一次获取的邮箱 |

---

## 接入邮箱服务完整指南

邮箱库 + 验证码接收 API 配合使用，可以实现**全自动获取邮箱与验证码**。

### 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                    你的脚本 / 应用                        │
│                                                          │
│  ① 获取邮箱 ──────► 邮箱库 API (email-lib)               │
│  ② 使用邮箱操作 ──► 目标服务                              │
│  ③ 等待邮件 ──────► Cloudflare Email Routing              │
│  ④ 提取验证码 ────► 验证码 API (codes/latest)             │
│  ⑤ 完成操作 ──────► 目标服务                              │
└──────────────────────────────────────────────────────────┘
```

### 前置准备

在接入邮箱服务之前，确保以下功能已正确配置：

| # | 步骤 | 说明 |
|---|------|------|
| 1 | 部署 Manyme API | 参照上文部署教程完成 Cloudflare Workers 部署 |
| 2 | 配置 Email Routing | 确保域名邮件已转发到 Worker（见第六步） |
| 3 | 创建分组（Group） | 在前端「分组管理」中创建对应服务的分组，配置匹配规则和提取规则 |
| 4 | 创建邮箱库分类 | 在「邮箱库」中创建分类，填入你的固定邮箱列表 |
| 5 | 验证连通性 | 手动发一封测试邮件，确认验证码能被正确提取 |

### 配置分组匹配与提取规则

要让 Worker 正确识别并提取某网站的验证码，需要配置**分组（Group）**的匹配规则和提取规则。

#### 匹配规则（Match Rules）

告诉系统"哪些邮件属于这个服务"。通常用发件人地址或邮件主题来匹配。

```
示例：Google 验证码
┌─────────────────────────────────────────────────────────────┐
│ 字段: sender    │ 运算符: contains  │ 模式: no-reply@google │
│ 字段: subject   │ 运算符: contains  │ 模式: 验证码           │
└─────────────────────────────────────────────────────────────┘
```

#### 提取规则（Extract Rules）

告诉系统"从邮件正文哪里提取验证码"。使用 `~` 作为通配符。

```
示例：邮件内容为「您的 Google 验证码是：123456，有效期为 10 分钟」
┌────────────────────────────────────────────────────────────┐
│ 字段名: 验证码  │ 来源: html  │ 模式: 验证码是：~，       │
│               → 提取结果: 123456                          │
└────────────────────────────────────────────────────────────┘
```

#### 响应模板（Response Template）

控制 API 返回的 JSON 格式。`{{变量名}}` 会被提取规则提取的值替换。

```json
{
  "site": "Google",
  "email": "{{收件人}}",
  "code": "{{验证码}}",
  "time": "{{接收时间}}"
}
```

系统内置了两个特殊的模板变量：
- `{{收件人}}` → 替换为邮件的 `to_addr`（收件人地址）
- `{{接收时间}}` → 替换为邮件的接收时间戳

> **💡 提示：** 如果不知道提取模式怎么写，可以先在前端页面查看收到的邮件原文（body_html / body_text），找到验证码前后的固定文本，用 `~` 代替验证码本身。

### 完整接入流程（Python 示例）

```python
import requests
import time
import json

# ===== 配置 =====
API_BASE = "https://manyme-api.你的用户名.workers.dev"
EMAIL_CATEGORY_ID = "你的邮箱库分类ID"      # 邮箱库分类 ID
CODE_GROUP_NAME = "Google"                  # 分组名称（用于查验证码）

# ===== 步骤 1：获取一个邮箱 =====
def get_email():
    resp = requests.get(f"{API_BASE}/api/email-lib/next/{EMAIL_CATEGORY_ID}")
    data = resp.json()
    print(f"[邮箱] {data['email']} (第 {data['index']+1}/{data['total']} 个)")
    return data["email"]

# ===== 步骤 2：获取验证码 =====
def wait_for_code(email, group_name, timeout=120):
    """
    等待验证码邮件到达并提取验证码。
    轮询 /api/codes/latest/code 接口，直到找到发给该邮箱的验证码。
    """
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(
                f"{API_BASE}/api/codes/latest/code",
                params={"group": group_name}
            )
            if resp.status_code == 200:
                data = resp.json()
                # 验证码可能包含在返回中，根据你的响应模板调整
                code = data.get("code") or data.get("验证码")
                if code:
                    print(f"[验证码] {code}")
                    return code
        except Exception as e:
            print(f"[轮询异常] {e}")

        print("[等待] 验证码未到，3 秒后重试...")
        time.sleep(3)

    raise TimeoutError("等待验证码超时")

# ===== 步骤 3：获取完整响应（含收件人邮箱）=====
def wait_for_email_response(email, group_name, timeout=120):
    """
    获取完整的邮件响应，包含邮箱地址和验证码，
    便于确认验证码属于当前使用的邮箱。
    """
    start = time.time()
    while time.time() - start < timeout:
        try:
            resp = requests.get(
                f"{API_BASE}/api/codes/latest",
                params={"group": group_name}
            )
            if resp.status_code == 200:
                data = resp.json()
                # 检查收件人是否是我们正在使用的邮箱
                if data.get("收件人") == email or data.get("to_addr") == email:
                    print(f"[响应] {json.dumps(data, ensure_ascii=False)}")
                    return data
        except Exception as e:
            print(f"[轮询异常] {e}")

        time.sleep(3)

    raise TimeoutError("等待邮件超时")

# ===== 批量处理 =====
def batch_process(count=5):
    results = []
    for i in range(count):
        print(f"\n===== 第 {i+1}/{count} 次 =====")
        try:
            # 1. 获取邮箱
            email = get_email()

            # 2. 使用邮箱执行你的业务逻辑
            # （替换成你实际的业务操作）
            print(f"[操作] 使用 {email} 执行业务...")
            # your_business_logic(email)

            # 3. 等待验证码
            time.sleep(5)  # 给邮件系统一点时间
            result = wait_for_email_response(email, CODE_GROUP_NAME)
            code = result.get("code") or result.get("验证码")

            # 4. 完成
            print(f"[完成] 邮箱={email}, 验证码={code}")
            results.append({"email": email, "code": code, "success": True})

        except Exception as e:
            print(f"[错误] {e}")
            results.append({"email": email, "success": False, "error": str(e)})

    return results

# ===== 运行 =====
if __name__ == "__main__":
    batch_process(5)
```

### JavaScript / Node.js 接入示例

```javascript
const API_BASE = "https://manyme-api.你的用户名.workers.dev";
const EMAIL_CATEGORY_ID = "你的邮箱库分类ID";
const CODE_GROUP_NAME = "Google";

async function getEmail() {
  const res = await fetch(`${API_BASE}/api/email-lib/next/${EMAIL_CATEGORY_ID}`);
  const data = await res.json();
  console.log(`[邮箱] ${data.email} (第 ${data.index + 1}/${data.total} 个)`);
  return data.email;
}

async function waitForCode(email, groupName, timeout = 120000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const res = await fetch(`${API_BASE}/api/codes/latest/code?group=${groupName}`);
    if (res.ok) {
      const data = await res.json();
      const code = data.code || data['验证码'];
      if (code) {
        // 可选：验证收件人邮箱是否匹配
        const detailRes = await fetch(`${API_BASE}/api/codes/latest?group=${groupName}`);
        if (detailRes.ok) {
          const detail = await detailRes.json();
          if (detail['收件人'] === email || detail.to_addr === email) {
            console.log(`[验证码] ${code}`);
            return code;
          }
        }
      }
    }
    console.log('[等待] 验证码未到，3 秒后重试...');
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('等待验证码超时');
}

async function batchProcess(count = 5) {
  for (let i = 0; i < count; i++) {
    console.log(`\n===== 第 ${i + 1}/${count} 次 =====`);
    try {
      const email = await getEmail();
      // 执行业务操作...
      console.log(`[操作] 使用 ${email} 执行业务`);
      await new Promise(r => setTimeout(r, 5000));
      const code = await waitForCode(email, CODE_GROUP_NAME);
      // 完成...
      console.log(`[完成] 邮箱=${email}, 验证码=${code}`);
    } catch (e) {
      console.error(`[错误] ${e.message}`);
    }
  }
}

batchProcess(5);
```

### cURL + shell 接入示例

```bash
#!/bin/bash
API="https://manyme-api.你的用户名.workers.dev"
CATEGORY_ID="你的邮箱库分类ID"
GROUP_NAME="Google"

for i in {1..5}; do
  echo "===== 第 $i 次 ====="

  # 获取邮箱
  EMAIL=$(curl -s "$API/api/email-lib/next/$CATEGORY_ID" | jq -r '.email')
  echo "邮箱: $EMAIL"

  # 执行业务操作（替换为你的业务命令）
  # curl -s -X POST "https://example.com/action" -d "email=$EMAIL" ...

  # 等待并轮询验证码
  CODE=""
  for attempt in {1..40}; do
    CODE=$(curl -s "$API/api/codes/latest/code?group=$GROUP_NAME" | jq -r '.code // .验证码 // empty')
    if [ -n "$CODE" ]; then
      # 确认收件人匹配
      RECIPIENT=$(curl -s "$API/api/codes/latest?group=$GROUP_NAME" | jq -r '.["收件人"] // .to_addr // empty')
      if [ "$RECIPIENT" = "$EMAIL" ] || [ -z "$RECIPIENT" ]; then
        break
      fi
    fi
    echo "等待验证码... ($attempt)"
    sleep 3
  done

  if [ -z "$CODE" ]; then
    echo "获取验证码失败，跳过"
    continue
  fi

  echo "验证码: $CODE"
  # 继续完成业务操作
  # curl -s -X POST "https://example.com/verify" -d "code=$CODE" ...

  echo "完成: $EMAIL / $CODE"
  sleep 2
done
```

### 关键设计要点

#### 1. 邮箱循环机制

邮箱库按**顺序轮询**，到达末尾自动回到开头。

```python
# 调用 6 次，3 个邮箱 → 每个邮箱出现 2 次（完整轮了两圈）
emails = [get_email() for _ in range(6)]
# 结果: [a, b, c, a, b, c]
```

如果某个邮箱在使用时失败，你可以**手动在 UI 中删除该邮箱**，指针会自动适配合法的邮箱列表。

#### 2. 验证码归属确认

当多个任务并发运行时，需要确保拿到的验证码属于当前正在使用的邮箱。有两种策略：

**策略 A：串行处理（推荐）**
```python
# 一次只处理一个，完成后再进行下一个
for email in email_pool:
    code = process_one(email)  # 获取邮箱 → 操作 → 等验证码 → 完成
```

优点：逻辑简单，不会拿错验证码
缺点：速度较慢

**策略 B：串行 + 邮箱校验**
```python
# 每个任务串行执行，但通过收件人地址二次确认
data = wait_for_email_response(email, group_name)
assert data["收件人"] == email  # 确认验证码属于当前邮箱
```

#### 3. 分组（Group）与邮箱库分类的对应关系

建议**一个服务一个分组，一个邮箱库分类**：

```
分组 (Group)                   邮箱库分类
──────────────────────────────────────────
Google 验证码         ←→        Google 邮箱池
Twitter 验证码        ←→        Twitter 邮箱池
Telegram 验证码       ←→        Telegram 邮箱池
```

#### 4. 待注册邮箱的预先配置

**方法：在 UI 中批量填入**

进入邮箱库 → 展开分类 → 在文本框中粘贴（一行一个）：

```
googleacc1@gmail.com
googleacc2@gmail.com
googleacc3@gmail.com
googleacc4@gmail.com
googleacc5@gmail.com
```

**方法：通过 API 批量导入**

```bash
curl -X PUT "https://manyme-api.你的用户名.workers.dev/api/email-lib/categories/分类ID/emails" \
  -H "Content-Type: application/json" \
  -d '{
    "emails": [
      "acc1@gmail.com",
      "acc2@gmail.com",
      "acc3@gmail.com",
      "acc4@gmail.com",
      "acc5@gmail.com"
    ]
  }'
```

#### 5. 当验证码取错时的处理

如果某次操作失败，邮箱已经被消耗（指针已+1），而你希望重新用这个邮箱再试一次：

```bash
# 方式一：重置指针到 0（从头开始）
curl -X POST "https://manyme-api.你的用户名.workers.dev/api/email-lib/categories/分类ID/reset"

# 方式二：手动在 UI 中点击「重置」
```

> ⚠️ **注意：** `next` API 是**无状态消耗**的 —— 调用一次指针就 +1，不可回退。如果你需要"重试同一个邮箱"的逻辑，应在你的程序层面控制，而不是依赖 API 回滚。

### 常见集成问题

**Q: 邮箱库的 API 返回 404？**
A: 确保 URL 中的 `categoryId` 正确。在 UI 中展开分类，下方显示的 API 地址直接复制使用。

**Q: 如何确认 Worker 收到了验证邮件？**
A: 在前端「邮件记录」页面查看。如果能搜到该邮件，说明 Email Routing 和 Worker 正常工作。

**Q: 验证码提取不对？**
A: 查看邮件原文，调整提取规则中的 `~` 位置。可以在 GroupDetail 页面直接修改提取规则后重新提取。

**Q: 可以多个客户端同时调用同一个分类吗？**
A: 可以。但需要注意：指针是**服务端全局的**，并发调用时可能出现两个客户端拿到同一个邮箱的情况。建议串行使用，或每个客户端实例使用独立的分类。

**Q: 如何清空邮箱库数据？**
```bash
# SQLite（本地开发）
sqlite3 data/manyme.db "DELETE FROM email_lib_categories;"

# D1（生产环境）
npx wrangler d1 execute manyme-db --command "DELETE FROM email_lib_categories;" --remote
```
