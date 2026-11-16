# Node.jsのバージョン、変える事。
FROM node:20-alpine

# タイムゾーンを日本時間にする（Alpineにはtzdataが含まれないため明示的に入れる）
RUN apk add --no-cache tzdata
ENV TZ=Asia/Tokyo

# 作業ディレクトリを /app に
WORKDIR /app

# app フォルダ内の内容をコンテナの /app にコピー
COPY app/ .

# 依存関係のインストール（package-lock.json と厳密に一致させる）
RUN npm ci

# ポートを開ける（Koyeb用）、使用してるポート番号にすること。
EXPOSE 3000

# アプリの起動、コマンドを指定しよう。index.jsなら"node", "index.js"
CMD ["node", "main.mjs"]
