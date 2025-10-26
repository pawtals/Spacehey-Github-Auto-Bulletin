import axios from "axios";
import { readFile } from "fs/promises";

export interface ImgbbUploadResponse {
    data: {
        id: string;
        title: string;
        url_viewer: string;
        url: string;
        display_url: string;
        width: string;
        height: string;
        size: string;
        time: string;
        expiration: string;
        image: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        thumb: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        medium: {
            filename: string;
            name: string;
            mime: string;
            extension: string;
            url: string;
        };
        delete_url: string;
    };
    success: boolean;
    status: number;
}

export interface UploadOptions {
    apiKey: string;
    imagePath: string;
    name?: string;
    expiration?: number; // in seconds, 60-15552000
}

/**
 * Uploads an image to imgbb using their API
 */
export async function uploadImage(options: UploadOptions): Promise<ImgbbUploadResponse> {
    const { apiKey, imagePath, name, expiration } = options;

    // Read the image file and convert to base64
    const imageBuffer = await readFile(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Build the API URL with query parameters
    const url = new URL('https://api.imgbb.com/1/upload');
    url.searchParams.append('key', apiKey);
    if (expiration) {
        url.searchParams.append('expiration', expiration.toString());
    }

    // Create form data
    const formData = new URLSearchParams();
    formData.append('image', base64Image);
    if (name) {
        formData.append('name', name);
    }

    try {
        const response = await axios.post<ImgbbUploadResponse>(
            url.toString(),
            formData,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        if (!response.data.success) {
            throw new Error(`Upload failed: ${JSON.stringify(response.data)}`);
        }

        return response.data;
    } catch (error: any) {
        if (error.response) {
            throw new Error(`imgbb API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        throw new Error(`Failed to upload image: ${error.message}`);
    }
}
