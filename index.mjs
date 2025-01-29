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
        const videoCodec = Utils.normalizeVideoCodec(streamOpts.videoCodec);

        let headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.3",
            "Connection": "keep-alive",
            "Accept": "*/*",
            "Range": "bytes=0-",
            "Icy-MetaData": "1"
        };
        headers = { ...headers, ...(customHeaders ?? {}) };

        let isHttpUrl = false;
        let isHls = false;
        if (typeof input === "string") {
            isHttpUrl = input.startsWith('http') || input.startsWith('https');
            isHls = input.includes('m3u');
        }

        const ffmpegOutput = new PassThrough();

        try {
            const command = ffmpeg(input)
                .addOption('-loglevel', 'error')
                .on('end', () => {
                    resolve("video ended");
                })
                .on("error", (err, stdout, stderr) => {
                    reject('cannot play video ' + err.message);
                })
                .on('stderr', console.error);
            let processed = false
            command.ffprobe(async (err, metadata) => {
                if (processed) return;
                processed = true;
                if (err) throw new Error(err);
                const videocodec = metadata.streams.find(s => s.codec_type === 'video');

                const fps = streamOpts.fps > getFps(videocodec.avg_frame_rate) ? videocodec.avg_frame_rate : streamOpts.fps;
                const width = streamOpts.width > videocodec.width ? videocodec.width : streamOpts.width;
                const height = streamOpts.height > videocodec.height ? videocodec.height : streamOpts.height;
                // General output options
                command
                    .output(ffmpegOutput)
                    .size(`${width}x${height}`)
                    .fpsOutput(fps)
                    .videoBitrate(`${streamOpts.bitrateKbps}k`)
                    .outputFormat("matroska");

                // Video setup
                command.outputOption('-bf', '0');
                switch (videoCodec) {
                    case 'H264':
                        console.log(path.resolve(config.subtitlePath));
                        command
                            .videoCodec("libx264")
                            .outputOptions([
                                '-tune zerolatency',
                                '-pix_fmt yuv420p',
                                //    '-strict', 'experimental',
                                `-preset ${streamOpts.h26xPreset}`,
                                `-g ${streamOpts.fps}`,
                                `-x264-params keyint=${streamOpts.fps}:min-keyint=${streamOpts.fps}`,
                                existsSync(path.resolve(config.subtitlePath)) ? `-vf subtitles=filename=${config.subtitlePath}:force_style='Fontname=Arial'` : undefined
                            ].filter(x => x !== undefined));
                        break;
                    default:
                        break;
                }

                // Audio setup
                command
                    .audioChannels(2)
                    .audioFrequency(48000)
                    .audioCodec("libopus");

                if (streamOpts.hardwareAcceleratedDecoding) {
                    command.inputOption('-hwaccel', 'auto');
                }

                if (streamOpts.minimizeLatency) {
                    command.addOptions([
                        '-fflags nobuffer',
                        '-analyzeduration 0'
                    ]);
                }

                if (isHttpUrl) {
                    command.inputOption('-headers', Object.keys(headers).map(key => key + ": " + headers[key]).join("\r\n"));
                    if (!isHls) {
                        command.inputOptions([
                            '-reconnect 1',
                            "-tls_verify 0",
                            '-reconnect_at_eof 1',
                            '-reconnect_streamed 1',
                            '-reconnect_delay_max 4294'
                        ]);
                    }
                }
                console.log(command._getArguments())
                command.run();
                onCancel(() => command.kill("SIGINT"));

                // Demuxing
                const { video, audio } = await demux(ffmpegOutput).catch((e) => {
                    command.kill("SIGINT");
                    throw e;
                });
                console.log(video)
                const videoStream = new VideoStream(mediaUdp);
                video.stream.pipe(videoStream);

                if (audio && includeAudio) {
                    const audioStream = new AudioStream(mediaUdp);
                    audio.stream.pipe(audioStream);
                    videoStream.syncStream = audioStream;
                    audioStream.syncStream = videoStream;
                }

            })

        } catch (e) {
            reject("cannot play video " + e.message);
        }
    });
}
function getFps(avgFrameRate) {
    if (typeof avgFrameRate !== "string") return avgFrameRate;
    const [numerator, denominator] = avgFrameRate.split('/').map(Number);

    const fps = numerator / denominator;

    return fps;
}