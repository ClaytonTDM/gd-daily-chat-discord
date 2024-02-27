//global.js

function Fetch(link) {
	return new Promise(function (res, rej) {
		fetch(link).then(resp => {
			if (!resp.ok) return rej(resp)
			gdps = resp.headers.get('gdps')
			if (gdps && gdps.startsWith('1.9/')) { onePointNine = true; gdps = gdps.slice(4) }
			resp.json().then(res)
		}).catch(rej)
	})
}

let iconData = null
let iconCanvas = null
let iconRenderer = null
let overrideLoader = false
let renderedIcons = {}

// very shitty code :) i suck at this stuff

async function renderIcons() {
	if (overrideLoader) return
	let iconsToRender = $('gdicon:not([rendered], [dontload])')
	if (iconsToRender.length < 1) return
	if (!iconData) iconData = await Fetch("https://gdbrowser.com/api/icons")
	if (!iconCanvas) iconCanvas = document.createElement('canvas')
	if (!iconRenderer) iconRenderer = new PIXI.Application({ view: iconCanvas, width: 50, height: 50, backgroundAlpha: 0});
	// if (loader.loading) return overrideLoader = true
	buildIcon(iconsToRender, 0)
}

function buildIcon(elements, current) {
	if (current >= elements.length) return
	
	let currentIcon = elements.eq(current)
	if (currentIcon.attr("rendering")) return
	else currentIcon.attr("rendering", true)

	let cacheID = currentIcon.attr('cacheID')

	let foundCache = renderedIcons[cacheID]
	if (foundCache) {
		finishIcon(currentIcon, foundCache.name, foundCache.data)
		return buildIcon(elements, current + 1)
	}

	let colG = currentIcon.attr('colG')
	if (isNaN(colG)) colG = null

	let iconConfig = {
		id: +currentIcon.attr('iconID'),
		form: parseIconForm(currentIcon.attr('iconForm')),
		col1: parseIconColor(currentIcon.attr('col1')),
		col2: parseIconColor(currentIcon.attr('col2')),
		colG: colG ? parseIconColor(currentIcon.attr('colG')) : null,
		glow: currentIcon.attr('glow') == "true",
		app: iconRenderer
	}
	if (iconConfig.colG == 8257280) iconConfig.colG = null

	loadIconLayers(iconConfig.form, iconConfig.id, function(a, b, c) {
		if (c) iconConfig.new = true
		new Icon(iconConfig, async function(icon) {
			let dataURL = await icon.getDataURL()
			let titleStr = `${Object.values(iconData.forms).find(x => x.form == icon.form).name} ${icon.id}`
			if (cacheID) renderedIcons[cacheID] = {name: titleStr, data: dataURL}
			finishIcon(currentIcon, titleStr, dataURL)
			if (overrideLoader) {
				overrideLoader = false
				renderIcons()
			}
			else buildIcon(elements, current + 1)
		})
	})
}

async function finishIcon(currentIcon, name, data) {
    const response = await fetch('/icon', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ d: data })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const reader = new FileReader();

    reader.onloadend = function() {
        const base64data = reader.result;
        currentIcon.append(`<img title="${name}" style="${currentIcon.attr("imgStyle") || ""}" src="${base64data}">`);
        currentIcon.attr("rendered", "true");
        currentIcon.removeAttr("rendering");
    }

    reader.readAsDataURL(blob);
}


//icon.js
const WHITE = 0xffffff
const colorNames = { "1": "Color 1", "2": "Color 2", "g": "Glow", "w": "White", "u": "UFO Dome" }
const formNames = { "player": "icon", "player_ball": "ball", "bird": "ufo", "dart": "wave" }
const qualities = { low: 'low', sd: 'low', med: 'hd', medium: 'hd', hd: 'hd' }
const positionMultipliers = { uhd: 4, hd: 2, low: 1 }
const yOffsets = { player_ball: -10, bird: 30, spider: 7, swing: -15 }

const loadedAssets = {}

async function loadTexture(name, path) {
    let loaded = await PIXI.Assets.load(path)
    if (loaded) loadedAssets[name] = loaded
    return loaded
}

function downloadFile(data, name) {
    let url = window.URL.createObjectURL(data);
    let downloader = document.createElement('a');
    downloader.href = url
    downloader.setAttribute("download", name);
    document.body.appendChild(downloader);
    downloader.click();
    document.body.removeChild(downloader);
}

const loadedIcons = {}
const iconFrames = {}

function getPositionMultiplier(quality) {
    return positionMultipliers[quality || 'uhd']
}

function positionPart(part, partIndex, layer, formName, isGlow, quality) {
    let positionMultiplier = getPositionMultiplier(quality)
    layer.position.x += (part.pos[0] * positionMultiplier)
    layer.position.y -= (part.pos[1] * positionMultiplier)
    layer.scale.x = part.scale[0]
    layer.scale.y = part.scale[1]
    if (part.flipped[0]) layer.scale.x *= -1
    if (part.flipped[1]) layer.scale.y *= -1
    layer.angle = part.rotation
    layer.zIndex = part.z

    if (!isGlow) {
        let tintInfo = iconData.robotAnimations.info[formName].tints
        let foundTint = tintInfo[partIndex]
        if (foundTint > 0) {
            let darkenFilter = new PIXI.ColorMatrixFilter();
            darkenFilter.brightness(0)
            darkenFilter.alpha = (255 - foundTint) / 255
            layer.filters = [darkenFilter]
        }
    }
}

function validNum(val, defaultVal) {
    let colVal = +val
    return isNaN(colVal) ? defaultVal : colVal
}

function getGlowColor(colors) {
    let glowCol = Number.isInteger(colors["g"]) ? colors["g"] : (colors[2] === 0 ? colors[1] : colors[2])
    // if (glowCol === 0) glowCol = WHITE // white glow if both colors are black
    return glowCol
}

function validateIconID(id, form) {
    let realID = Math.min(iconData.iconCounts[form], Math.abs(validNum(id, 1)))
    if (realID == 0 && !["player", "player_ball"].includes(form)) realID = 1
    return realID
}

function parseIconColor(col) {
    if (!col && col != 0) return WHITE
    else if (typeof col == "string" && col.length >= 6) return parseInt(col, 16)
    let rgb = iconData.colors[col]
    return rgb ? rgbToDecimal(rgb) : WHITE;
}

function parseIconForm(form) {
    let foundForm = iconData.forms[form]
    return foundForm ? foundForm.form : "player"
}

function loadIconLayers(form, id, cb) {
    let iconStr = `${form}_${padZero(validateIconID(id, form))}`

    if (iconData.icons.includes(iconStr)) return loadIconSheet(iconStr, cb)
}

function loadIconSheet(iconStr, cb) {
    fetch(`https://gdbrowser.com/iconkit/icons/${iconStr}-uhd.plist`).then(pl => pl.text()).then(plist => {

        let data = parsePlist(plist)

        Object.keys(data.frames).forEach(x => {
            iconFrames[x] = data.frames[x]
        })

        let sheetName = iconStr + "-sheet"
        loadTexture(sheetName, `https://gdbrowser.com/iconkit/icons/${iconStr}-uhd.png`).then(texture => {
            readIconData(texture, data.pos, cb)
        })
    })
}

function readIconData(texture, data, cb, folder=loadedIcons) {
    Object.keys(data).forEach(x => {
        let bounds = data[x]
        let textureRect = new PIXI.Rectangle(bounds.pos[0], bounds.pos[1], bounds.size[0], bounds.size[1])
        let partTexture = new PIXI.Texture(texture, textureRect)
        folder[x] = partTexture
    })
    if (cb) cb(texture, loadedAssets, true)
}

let dom_parser = new DOMParser()
function parsePlist(data) {
    let plist = dom_parser.parseFromString(data, "text/xml")
    let frames = plist.children[0].children[0].children[1].children
    let positionData = {}
    let dataFrames = {}
    for (let i=0; i < frames.length; i += 2) {
        let frameName = frames[i].innerHTML
        let frameData = frames[i + 1].children
        let isRotated = false
        dataFrames[frameName] = {}
        positionData[frameName] = {}

        for (let n=0; n < frameData.length; n += 2) {
            let keyName = frameData[n].innerHTML
            let keyData = frameData[n + 1].innerHTML
            if (["spriteOffset", "spriteSize", "spriteSourceSize"].includes(keyName)) {
                dataFrames[frameName][keyName] = parseWeirdArray(keyData)
            }

            else if (keyName == "textureRotated") {
                isRotated = frameData[n + 1].outerHTML.includes("true")
                dataFrames[frameName][keyName] = isRotated
            }

            else if (keyName == "textureRect") {
                let textureArr = keyData.slice(1, -1).split("},{").map(x => parseWeirdArray(x))
                positionData[frameName].pos = textureArr[0]
                positionData[frameName].size = textureArr[1]
            }  
        }

        if (isRotated) positionData[frameName].size.reverse()

    }
    return { pos: positionData, frames: dataFrames }
}

function parseWeirdArray(data) {
    return data.replace(/[^0-9,-.]/g, "").split(",").map(x => +x)
}

function padZero(num) {
    let numStr = num.toString()
    if (num < 10) numStr = "0" + numStr
    return numStr
}

function rgbToDecimal(rgb) {
    return (rgb.r << 16) + (rgb.g << 8) + rgb.b;
}

class Icon {
    constructor(data={}, cb) {
        this.app = data.app
        this.sprite = new PIXI.Container();
        this.form = data.form || "player"
        this.id = validateIconID(data.id, this.form)
        this.colors = {
            "1": validNum(data.col1, 0xafafaf),    // primary
            "2": validNum(data.col2, WHITE),       // secondary
            "g": validNum(data.colG, validNum(+data.colg, null)), // glow
            "w": validNum(data.colW, validNum(+data.colw, WHITE)), // white
            "u": validNum(data.colU, validNum(+data.colu, WHITE)), // ufo
        }

        if (data.colG == null) this.colors.g = null
                
        this.glow = !!data.glow
        this.layers = []
        this.glowLayers = []
        this.customFiles = null
        this.complex = ["spider", "robot"].includes(this.form)
        this.quality = data.quality ? (qualities[data.quality.toLowerCase()] || 'uhd') : 'uhd'

        if (data.isCustom && data.files) this.customFiles = data.files

        // most forms
        if (!this.complex) {
            let extraSettings = {}
            if (data.noUFODome) extraSettings.noDome = true
            if (data.isCustom) extraSettings.customFiles = this.customFiles
            let basicIcon = new IconPart(this.form, this.id, this.colors, this.glow, extraSettings)
            this.sprite.addChild(basicIcon.sprite)
            this.layers.push(basicIcon)
            this.glowLayers.push(basicIcon.sections.find(x => x.colorType == "g"))
        }

        // spider + robot
        else {
            let idlePosition = this.getAnimation(data.animation, data.animationForm).frames[0]
            let cFiles = data.isCustom ? this.customFiles : undefined
            idlePosition.forEach((x, y) => {
                x.name = iconData.robotAnimations.info[this.form].names[y]
                let part = new IconPart(this.form, this.id, this.colors, false, { part: x, skipGlow: true, customFiles: cFiles})
                positionPart(x, y, part.sprite, this.form, false, this.quality)
    
                let glowPart = new IconPart(this.form, this.id, this.colors, true, { part: x, onlyGlow: true, customFiles: cFiles})
                positionPart(x, y, glowPart.sprite, this.form, true, this.quality)
                glowPart.sprite.visible = (this.glow || this.colors[1] === 0)
                this.glowLayers.push(glowPart)
    
                this.layers.push(part)
                this.sprite.addChild(part.sprite)
            })
    
            let fullGlow = new PIXI.Container();
            this.glowLayers.forEach(x => fullGlow.addChild(x.sprite))
            this.sprite.addChildAt(fullGlow, 0)
            if (typeof Ease !== "undefined") this.ease = new Ease.Ease()
            this.animationSpeed = Math.abs(Number(data.animationSpeed) || 1)
            if (data.animation) this.setAnimation(data.animation, data.animationForm)
        }

        if (this.quality != 'uhd') this.sprite.scale.set(4 / getPositionMultiplier(this.quality))

        this.app.stage.removeChildren()
        this.app.stage.addChild(this.sprite)

        if (cb) cb(this)

    }

    updatePosition() {
        this.sprite.position.set(this.app.renderer.width / 2, (this.app.renderer.height / 2) + (yOffsets[this.form] || 0))
    }

    getAllLayers() {
        let allLayers = [];
        (this.complex ? this.glowLayers : []).concat(this.layers).forEach(x => x.sections.forEach(s => allLayers.push(s)))
        return allLayers
    }

    getLayerArr() {
        if (!this.complex) return this.layers
        else return this.layers.concat({ sections: this.glowLayers.map(x => x.sections[0]), part: { name: "Glow" } })
    }

    setColor(colorType, newColor, extra={}) {
        let colorStr = String(colorType).toLowerCase()
        if (!colorType || !Object.keys(this.colors).includes(colorStr)) return
        else this.colors[colorStr] = newColor
        let newGlow = getGlowColor(this.colors)
        this.getAllLayers().forEach(x => {
            if (colorType != "g" && x.colorType == colorStr) x.setColor(newColor)
            if (!extra.ignoreGlow && x.colorType == "g") x.setColor(newGlow)
        })
        if (!this.glow && colorStr == "1") {
            let shouldGlow = newColor == 0
            this.glowLayers.forEach(x => x.sprite.visible = shouldGlow)
        }
    }

    formName() {
        return formNames[this.form] || this.form
    }

    isGlowing() {
        return this.glowLayers[0].sprite.visible
    }

    setGlow(toggle) {
        this.glow = !!toggle
        this.glowLayers.forEach(x => x.sprite.visible = (this.colors["1"] == 0 || this.glow))
    }

    getAnimation(name, animForm) {
        let animationList = iconData.robotAnimations.animations[animForm || this.form]
        return animationList[name || "idle"] || animationList["idle"]
    }

    clearAnimation() {
        this.ease.removeAll()
        this.isRecording = false
        this.recordedFrames = []
        this.animationFrame = 0
    }

    setAnimation(data, animForm) {
        let animData = this.getAnimation(data, animForm) || this.getAnimation("idle")
        this.clearAnimation()
        this.animationName = data
        this.runAnimation(animData, data)
    }

    runAnimation(animData, animName, duration) {
        animData.frames[this.animationFrame].forEach((newPart, index) => {
            let section = this.layers[index]
            let glowSection = this.glowLayers[index]
            let truePosMultiplier = getPositionMultiplier(this.quality)
            if (!section) return

            // gd is weird with negative rotations
            let realRot = newPart.rotation
            if (realRot < -180) realRot += 360

            let movementData = {
                x: newPart.pos[0] * truePosMultiplier,
                y: newPart.pos[1] * truePosMultiplier * -1,
                scaleX: newPart.scale[0],
                scaleY: newPart.scale[1],
                rotation: realRot * (Math.PI / 180) // radians
            }
            if (newPart.flipped[0]) movementData.scaleX *= -1
            if (newPart.flipped[1]) movementData.scaleY *= -1

            let dur = (!duration ? 1 : (animData.info.duration / (this.animationSpeed || 1)))
            let bothSections = [section, glowSection]
            bothSections.forEach((x, y) => {
                let easing = this.ease.add(x.sprite, movementData, { duration: duration || 1, ease: 'linear' })
                let continueAfterEase = animData.frames.length > 1 && y == 0 && index == 0 && animName == this.animationName
                if (continueAfterEase) easing.on('complete', () => {
                    this.animationFrame++
                    if (this.animationFrame >= animData.frames.length) {
                        if (animData.info.loop) {
                            this.animationFrame = 0;
                        }
                        else setTimeout(() => {
                            this.animationFrame = 0;
                            this.runAnimation(animData, animName, dur);
                        }, 1000);
                    }
                    if (this.animationFrame < animData.frames.length) this.runAnimation(animData, animName, dur)
                })
            })
        })
    }

    recordAnimation(animName=this.animationName) {
        alert("work in progress!!! if you found this function then feel free to use, but looping is bugged rn")

        if (!this.animationFrame || this.animationSpeed < 0.1) return

        let w = this.app.view.width
        let h = this.app.view.height

        // needed because so canvas doesn't autocrop :v
        let bounds = new PIXI.Graphics();
        bounds.lineStyle(1, 0xFF0000);
        bounds.drawRect(0, 0, w - 1, h - 1);
        bounds.alpha = 0
        this.app.stage.addChild(bounds);

        const RECORDING_FPS = (this.animationSpeed <= 0.5 ? 30 : 60)
        const FRAME_DELAY = (1000 / RECORDING_FPS)

        this.setAnimation(animName)
        this.isRecording = true
        this.recordedFrames = []

        let firstFrame = -1
        let passedFrame = false

        let snapFrame = () => {
            if (firstFrame == -1 && this.animationFrame == 0) return // no idea why this works but removing it breaks things

            let frame = new Uint8Array(this.app.renderer.extract.pixels(this.app.stage)).buffer
            console.log([this.animationFrame, firstFrame])

            if (firstFrame == -1) firstFrame = this.animationFrame  // on first frame
            else if (firstFrame != this.animationFrame) passedFrame = true  // on passing first frame
            else if (passedFrame) { // on returning to first frame
                clearInterval(recorder)
                this.app.stage.removeChild(bounds)
                this.isRecording = false

                let apng = UPNG.encode(this.recordedFrames, w, h, 0, new Array(this.recordedFrames.length).fill(FRAME_DELAY))
                console.log(apng)
                let apngBlob = new Blob([apng], { type: "image/png" })
                downloadFile(apngBlob, this.getDownloadString() + "_" + animName + ".png")

                return
            }

            this.recordedFrames.push(frame)
        }

        let recorder = setInterval(async () => {
            snapFrame()
        }, FRAME_DELAY);
        snapFrame()
    }

    async getDataURL() {
        let [imgData, pixels] = await Promise.all([
            this.app.renderer.extract.image(this.sprite, "image/png", 1),
            this.app.renderer.extract.pixels(this.sprite)
        ]);

        let spriteSize = [imgData.width, imgData.height]
        // let spriteSize = [imgData.width, imgData.height]

        let xRange = [spriteSize[0], 0]
        let yRange = [spriteSize[1], 0]

        for (let i=3; i < pixels.length; i += 4) {
            let alpha = pixels[i]
            let realIndex = (i-3) / 4
            let pos = [realIndex % spriteSize[0], Math.floor(realIndex / spriteSize[0])]

            if (alpha > 10) { // if pixel is not blank...
                if (pos[0] < xRange[0]) xRange[0] = pos[0]      // if x pos is < the lowest x pos so far
                else if (pos[0] > xRange[1]) xRange[1] = pos[0] // if x pos is > the highest x pos so far
                if (pos[1] < yRange[0]) yRange[0] = pos[1]      // if y pos is < the lowest y pos so far
                else if (pos[1] > yRange[1]) yRange[1] = pos[1] // if y pos is > the highest y pos so far
            }
        }

        xRange[1]++
        yRange[1]++

        let canv = document.createElement("canvas")
        let ctx = canv.getContext('2d')

        canv.width = xRange[1] - xRange[0]
        canv.height = yRange[1] - yRange[0]
        ctx.drawImage(imgData, -xRange[0], -yRange[0])

        return canv.toDataURL("image/png")
    }

    getDownloadString() {
        return `${this.formName()}_${this.id}`
    }

    async pngExport() {
        let b64data = await this.getDataURL()
        let downloader = document.createElement('a');
        downloader.href = b64data
        downloader.setAttribute("download", `${this.getDownloadString()}.png`);
        document.body.appendChild(downloader);
        downloader.click();
        document.body.removeChild(downloader);
    }

    async copyToClipboard() {
        let b64data = await this.getDataURL()
        let blob = await fetch(b64data).then(res => res.blob())
        let item = new ClipboardItem({ [blob.type]: blob });
        navigator.clipboard.write([item]); 
    }

    psdExport() {
        if (typeof agPsd === "undefined") throw new Error("ag-psd not imported!")
        let glowing = this.isGlowing()
        this.setGlow(true)

        let psd = { width: this.app.stage.width, height: this.app.stage.height, children: [] }
        let allLayers = this.getAllLayers()
        let renderer = this.app.renderer
        let complex = this.complex

        function addPSDLayer(layer, parent, sprite) {
            allLayers.forEach(x => x.sprite.alpha = 0)
            layer.sprite.alpha = 255
        
            let layerChild = { name: layer.colorName, canvas: renderer.extract.canvas(sprite) }
            if (layer.colorType == "g") {
                if (parent.part) layerChild.name = parent.part.name + " glow"
                if (!complex && !glowing) layerChild.hidden = true
            }
            return layerChild
        }

        this.layers.forEach(x => {
            let partName = x.part ? x.part.name : "Icon"
            let folder = {
                name: partName,
                children: x.sections.map(layer => addPSDLayer(layer, x, this.sprite)),
                opened: true
            }
            psd.children.push(folder)
        })

        if (complex) {
            let glowFolder = { name: "Glow", children: [], opened: true, hidden: !glowing }
            glowFolder.children = this.glowLayers.map(x => addPSDLayer(x.sections[0], x, this.sprite))
            psd.children.unshift(glowFolder)
        }

        allLayers.forEach(x => x.sprite.alpha = 255)
        let output = agPsd.writePsd(psd)
        let blob = new Blob([output]);
        downloadFile(blob, `${this.getDownloadString()}.psd`)
        this.setGlow(glowing)
    }
}

class IconPart {
    constructor(form, id, colors, glow, misc={}) {

        if (colors[1] === 0 && !misc.skipGlow) glow = true // add glow if p1 is black

        let iconPath = `${form}_${padZero(id)}`
        let partString = misc.part ? "_" + padZero(misc.part.part) : ""
        let sections = {}
        if (misc.part) this.part = misc.part

        this.sprite = new PIXI.Container();
        this.sections = []

        if (!misc.skipGlow) {
            let glowCol = getGlowColor(colors)
            sections.glow = new IconLayer(`${iconPath}${partString}_glow_001.png`, glowCol, "g", misc.customFiles)
            if (!glow) sections.glow.sprite.visible = false
        }

        if (!misc.onlyGlow) {
            if (form == "bird" && !misc.noDome) { // ufo top
                sections.ufo = new IconLayer(`${iconPath}_3_001.png`, WHITE, "u", misc.customFiles)
            }

            sections.col1 = new IconLayer(`${iconPath}${partString}_001.png`, colors["1"], "1", misc.customFiles)
            sections.col2 = new IconLayer(`${iconPath}${partString}_2_001.png`, colors["2"], "2", misc.customFiles)

            let extraPath = `${iconPath}${partString}_extra_001.png`
            let hasExtra = misc.customFiles ? misc.customFiles[extraPath] : iconFrames[extraPath]
            if (hasExtra) {
                sections.white = new IconLayer(extraPath, colors["w"], "w", misc.customFiles)
            }
        }

        let layerOrder = ["glow", "ufo", "col2", "col1", "white"].map(x => sections[x]).filter(x => x)
        layerOrder.forEach(x => {
            this.sections.push(x)
            this.sprite.addChild(x.sprite)
        })
    }
}

class IconLayer {
    constructor(path, color, colorType, customFiles) {

        let loadedTexture = loadedIcons[path]
        if (customFiles) loadedTexture = customFiles[path].texture

        let loadedOffsets = iconFrames[path]
        if (customFiles) loadedOffsets = customFiles[path].frames

        this.offsets = loadedOffsets || { spriteOffset: [0, 0] }
        this.sprite = new PIXI.Sprite(loadedTexture || PIXI.Texture.EMPTY)
        this.name = path

        this.colorType = colorType
        this.colorName = colorNames[colorType]
        this.setColor(color)
        this.applyOffset()

        if (this.offsets.textureRotated) {
            this.sprite.angle = -90
        }
        this.angleOffset = this.sprite.angle

        this.sprite.anchor.set(0.5)
    }

    applyOffset() {
        this.sprite.position.x = Math.floor(this.offsets.spriteOffset[0] || 0)
        this.sprite.position.y = Math.floor(this.offsets.spriteOffset[1] || 0) * -1
    }

    setColor(color) {
        this.color = validNum(color, WHITE)
        this.sprite.tint = this.color
    }
}
