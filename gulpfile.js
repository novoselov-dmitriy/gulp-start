const { src, dest, series, watch } = require('gulp');
const cssClean = require('gulp-clean-css');
const del = require('del');
const sass = require('gulp-sass')(require('sass'));
const autoPrefixer = require('gulp-autoprefixer');
const svgSprite = require('gulp-svg-sprite');
const svgMin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const fileInclude = require('gulp-file-include');
const webp = require('gulp-webp');
const webpackStream = require('webpack-stream');
const typograf = require('gulp-typograf');
const notify = require('gulp-notify');
const plumber = require('gulp-plumber');
const replace = require('gulp-replace');
const gulpif = require('gulp-if');
const browserSync = require('browser-sync').create();

const srcFolder = './src';
const buildFolder = './dest';

const path = {
    src: {
        fonts: `${srcFolder}/fonts/*.{woff,woff2,ttf}`,
        svg: `${srcFolder}/svg/*.svg`,
        images: `${srcFolder}/img/**/*.{jpg,png,jpeg,svg,webp,avif,gif}`,
        styles: `${srcFolder}/scss/*.scss`,
        scripts: `${srcFolder}/js/main.js`,
        html: `${srcFolder}/*.html`
    },

    build: {
        fonts: `${buildFolder}/assets/fonts`,
        svg: `${buildFolder}/assets/img`,
        images: `${buildFolder}/assets/img`,
        styles: `${buildFolder}/assets/css`,
        scripts: `${buildFolder}/assets/js`,
        html: `${buildFolder}`
    },
    
    watch: {
        fonts: `${srcFolder}/fonts/*.{woff,woff2,ttf}`,
        svg: `${srcFolder}/svg/*.svg`,
        images: `${srcFolder}/img/**/*.{jpg,png,jpeg,svg,webp,avif,gif}`,
        styles: `${srcFolder}/scss/**/*.scss`,
        scripts: `${srcFolder}/js/**/*.js`,
        html: `${srcFolder}/**/*.html`
    }
}

let isProduction = false;

const clean = () => {
    return del([buildFolder])
}

const fonts  = () => {
    return src(path.src.fonts)
        .pipe(dest(path.build.fonts))
        .pipe(browserSync.stream());
}

const svgToSprite = () => {
    return src(path.src.svg)
        .pipe(svgMin(
            { 
                js2svg: { pretty: true } 
            }
        ))
        .pipe(cheerio(
            {
                run: function($) {
                    $('[fill]').removeAttr('fill');
                    $('[stroke]').removeAttr('stroke');
                    $('[style]').removeAttr('style');
                },

                parserOptions: {
                    xmlMode: true
                }
            }
        ))
        .pipe(replace( '&gt;', '>' ))
        .pipe(svgSprite(
            {
                mode: {
                    stack: {
                        sprite: '../sprite.svg'
                    }
                }
            }
        ))
        .pipe(dest(path.build.svg))
        .pipe(browserSync.stream());
}

const styles = () => {
    return src(path.src.styles)
        .pipe(plumber(
            notify.onError(
                {
                    title: 'SCSS',
                    message: 'Error: <%= error.message %>'
                }
            )
        ))
        .pipe(sass())
        .pipe(autoPrefixer(
            {
                cascade: false,
                grid: true,
                overrideBrowserslist: ['last 3 versions']
            }
        ))
        .pipe(gulpif(isProduction, cssClean(
            {
                level: 2
            }
        )))
        .pipe(dest(path.build.styles))
        .pipe(browserSync.stream());
}

const images = () => {
    return src(path.src.images)
        .pipe(webp())
        .pipe(dest(path.build.images))
        .pipe(browserSync.stream());
}

const scripts = () => {
    return src(path.src.scripts)
        .pipe(plumber(
            notify.onError(
                {
                    title: 'JS',
                    message: 'Error: <%= error.message %>'
                }
            )
        ))
        .pipe(webpackStream(
            {
                mode: isProduction ? 'production' : 'development',
                output: {
                    filename: 'main.js'
                },
                module: {
                    rules: [{
                        test: /\.m?js$/,
                        exclude: /node_modules/,
                        use: {
                            loader: 'babel-loader',
                            options: {
                                presets: [
                                    ['@babel/preset-env', {
                                        targets: 'defaults'
                                    }]
                                ]
                            }
                        }
                    }]
                }
            }
        ))
        .on('error', function(err) {
            console.error('WEBPACK ERORR', err);
            this.emit('end');
        })
        .pipe(dest(path.build.scripts))
        .pipe(browserSync.stream());
}

const htmlInclude = () => {
    return src(path.src.html)
        .pipe(fileInclude(
            {
                prefix: '@',
                basepath: '@file'
            }
        ))
        .pipe(typograf(
            {
                locale: [ 'ru', 'en-US' ]
            }
        ))
        .pipe(dest(path.build.html))
        .pipe(browserSync.stream());
}

const watcher = () => {
    browserSync.init(
        {
            server: {
                baseDir: `${buildFolder}`
            }
        }
    )

    watch(path.watch.fonts, fonts);
    watch(path.watch.svg, svgToSprite);
    watch(path.watch.images, images);
    watch(path.watch.styles, styles);
    watch(path.watch.scripts, scripts);
    watch(path.watch.html, htmlInclude);
}

const toProduction = (done) => {
    isProduction = true;
    done();
}

exports.default = series(clean, fonts, svgToSprite, images, styles, scripts, htmlInclude, watcher);

exports.build = series(toProduction, clean, fonts, svgToSprite, images, styles, scripts, htmlInclude, watcher);