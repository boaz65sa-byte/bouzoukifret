# Stem proxy — Node + yt-dlp + ffmpeg
FROM node:20-slim

# yt-dlp (בינארי סטטי) + ffmpeg להמרת אודיו
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates wget ffmpeg \
 && wget -qO /usr/local/bin/yt-dlp \
      https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp \
 && apt-get purge -y wget && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV PORT=3456
EXPOSE 3456
CMD ["node", "server.js"]
