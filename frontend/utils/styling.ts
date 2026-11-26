import { Dimensions, PixelRatio } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const [shortDimension, longDimension] =
    SCREEN_WIDTH < SCREEN_HEIGHT
        ? [SCREEN_WIDTH, SCREEN_HEIGHT]
        : [SCREEN_HEIGHT, SCREEN_WIDTH];

const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const widthRatio = Math.min(Math.max(shortDimension / guidelineBaseWidth, 0.85), 1.28);
const heightRatio = Math.min(Math.max(longDimension / guidelineBaseHeight, 0.82), 1.25);

export const scale = (size: number) =>
    Math.round(
        PixelRatio.roundToNearestPixel(widthRatio * (size as number))
    );

export const verticalScale = (size: number) =>
    Math.round(
        PixelRatio.roundToNearestPixel(heightRatio * (size as number))
    );
