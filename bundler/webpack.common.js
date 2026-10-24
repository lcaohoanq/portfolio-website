const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCSSExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

function galleryImages(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const relativePath = prefix + entry.name;
        if (entry.isDirectory()) {
            return galleryImages(path.join(directory, entry.name), relativePath + '/');
        }
        return entry.isFile() && /\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name)
            ? [relativePath.split('/').map(encodeURIComponent).join('/')]
            : [];
    }).sort();
}

for (const name of ['.env.local', '.env']) {
    const file = path.resolve(__dirname, '..', name);
    if (fs.existsSync(file)) process.loadEnvFile(file);
}

module.exports = {
    entry: {
        room: path.resolve(__dirname, '../src/script.ts'),
        invitation: path.resolve(__dirname, '../src/Invitation/index.tsx'),
    },
    output: {
        hashFunction: 'xxhash64',
        filename: '[name].[contenthash].js',
        path: path.resolve(__dirname, '../public'),
        publicPath: '/',
    },
    devtool: 'source-map',
    plugins: [
        new CopyWebpackPlugin({
            patterns: [{ from: path.resolve(__dirname, '../static') }],
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, '../src/index.html'),
            chunks: ['room'],
            minify: true,
        }),
        new HtmlWebpackPlugin({
            template: path.resolve(__dirname, '../src/Invitation/index.html'),
            filename: 'invitation.html',
            chunks: ['invitation'],
            minify: true,
        }),
        new webpack.DefinePlugin({
            __GALLERY_IMAGES__: JSON.stringify(galleryImages(path.resolve(__dirname, '../static/invitation/gallery'))),
            __SUPABASE_URL__: JSON.stringify(process.env.VITE_SUPABASE_URL || ''),
            __SUPABASE_ANON_KEY__: JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || ''),
        }),
        new MiniCSSExtractPlugin(),
    ],
    resolve: {
        alias: {
            three: path.resolve('./node_modules/three'),
        },
        extensions: ['.tsx', '.ts', '.js'],
    },
    module: {
        rules: [
            // HTML
            {
                test: /\.(html)$/,
                use: ['html-loader'],
            },
            {
                test: /\.ts?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            // JS
            {
                test: /\.tsx$/,
                exclude: /node_modules/,
                use: ['babel-loader'],
            },

            // CSS
            {
                test: /\.css$/,
                use: [MiniCSSExtractPlugin.loader, 'css-loader'],
            },

            // Images
            {
                test: /\.(jpg|png|gif|svg)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/images/[hash][ext]',
                },
            },
            // Audio
            {
                test: /\.(mp3|wav)$/,
                loader: 'file-loader',
                options: {
                    name: '[path][name].[ext]',
                },
            },
            // Fonts
            {
                test: /\.(ttf|eot|woff|woff2)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'assets/fonts/[hash][ext]',
                },
            },
            // Shaders
            {
                test: /\.(glsl|vs|fs|vert|frag)$/,
                exclude: /node_modules/,
                use: ['glslify-import-loader', 'raw-loader', 'glslify-loader'],
            },
        ],
    },
};
