import { Client } from 'discord.js-selfbot-v13';
import { AudioStream, Streamer, VideoStream, Utils } from '@dank074/discord-video-stream';
import config from './config.mjs';
import PCancelable from 'p-cancelable';
import { PassThrough } from 'node:stream';
import ffmpeg from 'fluent-ffmpeg';
import { demux } from '@dank074/discord-video-stream';
import path from 'node:path';
import { existsSync } from 'node:fs';
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
function streamLivestreamVideo(input, mediaUdp, includeAudio = true, customHeaders) {
    return new PCancelable(async (resolve, reject, onCancel) => {
        const streamOpts = mediaUdp.mediaConnection.streamOptions;

        const headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
            "Connection": "keep-alive",
            "Accept": "*/*",
            "Range": "bytes=0-",
            "Icy-MetaData": "1",
            ...(customHeaders ?? {})
        };

        const isHttpUrl = typeof input === "string" && (input.startsWith('http') || input.startsWith('https'));
        const isHls = typeof input === "string" && input.includes('m3u');

        const ffmpegOutput = new PassThrough();

        try {
            const command = ffmpeg(input)
                .addOption('-loglevel', 'error')
                .addOption('-hwaccel', 'auto')
                .on('end', () => resolve("video ended"))
                .on("error", (err) => reject('cannot play video ' + err.message))
                .on('stderr', console.error);

            if (isHttpUrl) {
                command.inputOption('-headers', Object.entries(headers)
                    .map(([key, value]) => `${key}: ${value}`).join('\r\n'));
                
                if (!isHls) {
                    command.inputOptions([
                        '-reconnect', '1',
                        '-reconnect_at_eof', '1',
                        '-reconnect_streamed', '1',
                        '-reconnect_delay_max', '4294'
                    ]);
                }
            }

            command.output(ffmpegOutput)
                .videoCodec('libx264')
                .size(`${streamOpts.width}x${streamOpts.height}`)
                .fps(streamOpts.fps)
                .videoBitrate(`${streamOpts.bitrateKbps}k`)
                .audioChannels(2)
                .audioFrequency(48000)
                .audioCodec('libopus')
                .outputOptions([
                    '-bf', '0',
                    '-tune', 'zerolatency',
                    '-pix_fmt', 'yuv420p',
                    `-preset`, streamOpts.h26xPreset,
                    `-g`, `${streamOpts.fps}`,
                    `-x264-params`, `keyint=${streamOpts.fps}:min-keyint=${streamOpts.fps}`,
                    '-fflags', 'nobuffer',
                    '-analyzeduration', '0'
                ])
                .format('matroska');

            command.run();
            onCancel(() => command.kill('SIGINT'));

            const { video, audio } = await demux(ffmpegOutput);
            const videoStream = new VideoStream(mediaUdp);
            video.stream.pipe(videoStream);

            if (audio && includeAudio) {
                const audioStream = new AudioStream(mediaUdp);
                audio.stream.pipe(audioStream);
                videoStream.syncStream = audioStream;
                audioStream.syncStream = videoStream;
            }

        } catch (error) {
            reject("cannot play video " + error.message);
        }
    });
}
function getFps(avgFrameRate) {
    if (typeof avgFrameRate !== "string") return avgFrameRate;
    const [numerator, denominator] = avgFrameRate.split('/').map(Number);

    const fps = numerator / denominator;

    return fps;
}