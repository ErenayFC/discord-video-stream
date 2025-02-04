# Discord Video Stream Bot

> [!CAUTION]
> Using any kind of automation programs on your account can result in your account getting permanently banned by Discord. Use at your own risk

A Discord bot that can stream videos with subtitle support in voice channels.

## Features

- Stream videos in Discord voice channels
- Support for ASS subtitle format
- Hardware acceleration support
- Configurable video quality settings

## Installation

1. Clone the repository

```bash
git clone https://github.com/ErenayFC/discord-video-stream
cd discord-video-stream
```

2. Install dependencies

```bash
npm install
```

3. Configure the bot
- Rename `config.example.mjs` to `config.mjs`
- Fill in your Discord token and other settings

## Usage

1. To start the bot:

```bash
npm run start
```

2. To add subtitles to a video:

```bash
npm run subtitles
```

## Configuration

Edit `config.mjs` to customize:
- Discord token
- Server and channel IDs
- Input/output video paths
- Subtitle path
- Video quality settings
- Stream options

### Configuration Example
```javascript
{
    // Discord Settings
    token: "YOUR_DISCORD_TOKEN",
    guildId: "YOUR_GUILD_ID",
    channelId: "YOUR_CHANNEL_ID",
    
    // Video Settings
    videoPath: "./output.mp4",
    inputVideoPath: './input.mp4',
    subtitlePath: './subtitle.ass',
    
    // Stream Options
    streamOptions: {
        width: 1920,
        height: 1080,
        fps: 30,
        bitrateKbps: 3000,
        maxBitrateKbps: 4000,
        videoCodec: "H264",
        h26xPreset: "veryfast",
        hardwareAcceleratedDecoding: true,
        minimizeLatency: true,
        rtcpSenderReportEnabled: true
    }
}
```

## Requirements

- Node.js 16 or higher
- FFmpeg
- Discord account token