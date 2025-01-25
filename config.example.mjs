export default {
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