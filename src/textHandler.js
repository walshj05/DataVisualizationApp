import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import fontPath from './fonts/Roboto_Regular.json'; // Path to the font file
const fontLoader = new FontLoader();

function generateTextGeometry(text, parameters = { size: 1, height: 0.01 }) {
    return new Promise((resolve, reject) => {
        fontLoader.load(fontPath, (font) => {
            const textGeometry = new TextGeometry(text, {
                font: font,
                size: parameters.size,
                height: parameters.height,
            });
            resolve(textGeometry);
        }, null, (error) => {
            reject(error);
        });
    });
}

export { generateTextGeometry };

