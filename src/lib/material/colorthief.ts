// original source: https://github.com/lokesh/color-thief/blob/master/src/color-thief-node.js
import { getPixels } from 'ndarray-pixels';
import sharp from 'sharp';
import quantize, { RgbPixel } from '@lokesh.dhakar/quantize';
import { NdArray } from 'ndarray';

export type Palette = [red: number, blue: number, green: number];
type Image = Buffer | ArrayBuffer | Uint8Array | Uint8ClampedArray | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array | Float32Array | Float64Array | string;
interface Options {
    colorCount: number,
    quality: number
}

function createPixelArray(pixels: Uint8Array, pixelCount: number, quality: number): RgbPixel[] {
    const pixelArray = [];

    for (let i = 0, offset, r, g, b, a; i < pixelCount; i += quality) {
        offset = i * 4;
        r = pixels[offset];
        g = pixels[offset + 1];
        b = pixels[offset + 2];
        a = pixels[offset + 3];

        // If pixel is mostly opaque and not white
        if ((typeof a === 'undefined' || a >= 125) && !(r > 250 && g > 250 && b > 250))
            pixelArray.push([r, g, b] as RgbPixel);
    }

    return pixelArray;
}

function validateOptions(options: Options) {
    let { colorCount, quality } = options;

    if (typeof colorCount === 'undefined' || !Number.isInteger(colorCount)) {
        colorCount = 10;
    } else if (colorCount === 1) {
        throw new Error('`colorCount` should be between 2 and 20. To get one color, call `getColor()` instead of `getPalette()`');
    } else {
        colorCount = Math.max(colorCount, 2);
        colorCount = Math.min(colorCount, 20);
    }

    if (typeof quality === 'undefined' || !Number.isInteger(quality) || quality < 1) quality = 10;

    return { colorCount, quality };
}

const loadImg = async (img: Image): Promise<NdArray<Uint8Array>> => {
    return new Promise((resolve, reject) => {
        sharp(img)
        .toBuffer()
        .then(buffer => sharp(buffer).metadata()
            .then(metadata => ({ buffer, format: metadata.format })))
        .then(({ buffer, format }) => getPixels(buffer, format ?? ""))
        .then(resolve)
        .catch(reject);
    })
}

// export function getColor(img: Image, quality?: number): Promise<Palette | null> {
//     return getPalette(img, 5, quality)
//         .then(palette => palette === null ? null : palette[0]);
// }

export function getPalette(img: Image, colorCount: number = 10, quality: number = 10): Promise<Palette[] | null> {
    const options = validateOptions({ colorCount, quality });

    return loadImg(img)
        .then(imgData => {
            const pixelCount = imgData.shape[0] * imgData.shape[1];
            const pixelArray = createPixelArray(imgData.data, pixelCount, options.quality);

            const cmap = quantize(pixelArray, options.colorCount);
            const palette = cmap ? cmap.palette() : null;

            return palette;
        });
}
