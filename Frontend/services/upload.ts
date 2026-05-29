import * as ImagePicker from 'expo-image-picker';

export const pickImageFromGallery = async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
        if (!canAskAgain) {
            throw new Error('Gallery permission permanently denied. Please enable it in your device settings.');
        }
        throw new Error('Gallery permission denied!');
    }

    const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 1,
        exif: false, // skip heavy metadata unless needed
    });

    if (result.canceled || !result.assets?.[0]?.uri) {
        return null;
    }
    const image = result.assets[0];
    if (image.fileSize && image.fileSize > 5 * 1024 * 1024) {
        throw new Error("Image size must be less than 5MB");
    }
    return image;
};

export const createImageFormData = async (
    image: ImagePicker.ImagePickerAsset,
    fieldName: string
) => {
    console.log("SELECTED IMAGE:", image);
    const formData = new FormData();
    formData.append(
        fieldName,
        {
            uri: image.uri,
            name: image.fileName || `${fieldName}.jpg`,
            type: image.mimeType || "image/jpeg",
        } as any
    );
    return formData;
}