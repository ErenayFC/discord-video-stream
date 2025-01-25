import { Client } from 'discord.js-selfbot-v13';
import { Streamer, streamLivestreamVideo } from '@dank074/discord-video-stream';
import config from './config.mjs';

const client = new Client({
    checkUpdate: false
});

const streamer = new Streamer(client);

async function startStream() {
    try {
        console.log("Joining voice channel...");
        await streamer.joinVoice(config.guildId, config.channelId);
        console.log("Joined voice channel");

        console.log("Creating stream...");
        const udp = await streamer.createStream(config.streamOptions);
        console.log("Stream created");

        console.log("Starting video stream...");
        udp.mediaConnection.setSpeaking(true);
        udp.mediaConnection.setVideoStatus(true);

        try {
            const command = await streamLivestreamVideo(config.videoPath, udp);
            console.log("Video stream completed successfully:", command);
        } catch (error) {
            if (error.isCanceled) {
                console.log('FFmpeg command canceled');
            } else {
                console.error('Video stream error:', error);
            }
        } finally {
            udp.mediaConnection.setSpeaking(false);
            udp.mediaConnection.setVideoStatus(false);
            console.log("Video stream closed");
        }

    } catch (error) {
        console.error('General error:', error);
    }
}

client.on('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    await startStream();
});

process.on('unhandledRejection', error => {
    console.error('Unhandled rejection:', error);
});

console.log("Starting bot...");
await client.login(config.token);