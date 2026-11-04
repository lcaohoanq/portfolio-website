type Resource =
    | TextureResource
    | CubeTextureResource
    | ModelResource
    | AudioResource;

declare interface StyleSheetCSS {
    [key: string]: React.CSSProperties;
}

type TextureResource = {
    name: string;
    type: 'texture';
    path: string;
};

type CubeTextureResource = {
    name: string;
    type: 'cubeTexture';
    path: string[];
};

type ModelResource = {
    name: string;
    type: 'gltfModel';
    path: string;
};

type AudioResource = {
    name: string;
    type: 'audio';
    path: string;
};

type EnclosingPlane = {
    size: THREE.Vector2;
    position: THREE.Vector3;
    rotation: THREE.Euler;
};

type CameraKeyframe = {
    position: THREE.Vector3;
    focalPoint: THREE.Vector3;
};

type LoadedResource =
    | LoadedTexture
    | LoadedCubeTexture
    | LoadedModel
    | LoadedAudio;

type LoadedTexture = THREE.Texture;

type LoadedModel = import('three/examples/jsm/loaders/GLTFLoader').GLTF;

type LoadedCubeTexture = THREE.CubeTexture;

type LoadedAudio = AudioBuffer;

// Installed only by the local Story exporter to reproduce the room's audio timeline.
interface Window {
    __STORY_AUDIO_CAPTURE__?: {
        play: (id: string, name: string, buffer: AudioBuffer, options: {
            volume: number; loop: boolean; detune: number;
            filter?: { type: BiquadFilterType; frequency: number };
        }) => void;
        volume: (id: string, value: number) => void;
        frequency: (id: string, value: number) => void;
    };
}

type ResourceType = 'texture' | 'cubeTexture' | 'gltfModel';
