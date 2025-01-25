import { spawn } from 'child_process';
import config from './config.mjs';

async function addSubtitlesToVideo() {
    const ffmpeg = spawn('ffmpeg', [
        '-i', config.inputPath,
        '-vf', `ass=${config.subtitlePath}`,
        '-c:a', 'aac',
        '-b:a', '192k',
        '-strict', 'experimental',
        config.outputPath
    ]);

    ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg output: ${data}`);
    });

    ffmpeg.on('close', (code) => {
        if (code === 0) {
            console.log('Video successfully created!');
        } else {
            console.error('FFmpeg process failed.');
        }
    });
}

addSubtitlesToVideo(); 