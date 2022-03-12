import { asyncSleep } from "../helpers/game_helper";
import { isTypeObject } from "../helpers/type_helper";

const xmlns = "http://www.w3.org/2000/svg";

class SVGElement {

  constructor() {
    this._node = null
    this._data = {}
    this._listeners = {}
  }

  data(key, value) {
    if(isTypeObject(key) && value === undefined) {
      Object.assign(this._data, key)
      return this;
    }
    if(key === undefined) return this._data;
    if(value === undefined) return this._data[key];
    this._data[key] = value;
    return this;
  }

  width(value) {
    if(value === undefined) return parseFloat(this._node.getAttribute("width"));
    return this.attr("width", value)
  }

  height(value) {
    if(value === undefined) return parseFloat(this._node.getAttribute("height"));
    return this.attr("height", value)
  }

  hide() {
    return this.attr("visibility", "hidden")
  }

  visible() {
    return this.attr("visibility", "visible")
  }

  size(w, h) {
    return this.width(w).height(h);
  }

  addClass(name) {
    this._node.classList.add(name)
    return this;
  }

  removeClass(name) {
    this._node.classList.remove(name)
    return this;
  }

  move(x, y) {
    return this.x(x).y(y);
  }

  x(value) {
    if(value === undefined) return parseFloat(this._node.getAttribute("x"));
    return this.attr("x", value)
  }

  y(value) {
    if(value === undefined) return parseFloat(this._node.getAttribute("y"));
    return this.attr("y", value)
  }

  incX(value) {
    return this.attr("x", this.x()+value)
  }

  incY(value) {
    return this.attr("y", this.y()+value)
  }

  bbox() {
    return this._node.getBBox();
  }

  add(child) {
    this._node.appendChild(child._node)
    return this;
  }

  id(value) {
    if(value === undefined) return this._node.getAttribute('id');
    return this.attr('id', value)
  }

  fill(value) {
    return this.attr("fill", value)
  }

  stroke(value, strokeWidth=null) {
    if(strokeWidth) {
      this.attr("stroke-width", strokeWidth)
    }
    return this.attr("stroke", value)
  }

  attr(key, value) {
    if(value === undefined) return this._node.getAttribute(key)
    this._node.setAttribute(key, value)
    return this;
  }

  addListener(name, listener) {
    this._node.addEventListener(name, listener)
    this._listeners[name] = listener
    return this;
  }

  removeListener(name) {
    this._node.removeEventListener(name, this._listeners[name])
    return this;
  }

  attachTo(selectorOrObject) {
    if(selectorOrObject instanceof SVGElement) {
      selectorOrObject.add(this)
    }
    else {
      const parent = document.querySelector(selectorOrObject);
      if(!parent) throw new Error(`Unable to attch. Invalid selector ${selectorOrObject}`);
      parent.appendChild(this._node)
    }
    return this;
  }

  rotate(angle, x, y) {
    return this.attr('transform', `rotate(${angle} ${x} ${y})`)
  }

  remove() {
    this._node.remove()
    this._node = null;
  }

  bringToFront() {
    if(this._node.nextSibling) {
      const parent = this._node.parentNode;
      parent.appendChild(this._node)
    }
    return this;
  }

  async animateTranslate(tx, ty, duration, steps=20) {
    let x = this.x()
    let y = this.y()
    const stepX = (tx - x)/steps
    const stepY = (ty - y)/steps
    const delay = duration/steps
    for(let i=0;i<steps;i++) {
      await asyncSleep(delay)
      x += stepX
      y += stepY
      this.move(x,y)
    }
    return true
  }

  async animateScale(factor, duration, centerX, centerY, rotation=0) {
    const styleSheet = document.styleSheets[0]
    const keyFrameStyle = `@keyframes scaleupdown {
      from {
        transform: scale(1) rotate(${rotation}deg);
      }
      
      50% {
        transform: scale(${factor}) rotate(${rotation}deg);
      }
    
      to {
        transform: scale(1) rotate(${rotation}deg);
      }
    }`
    const keyFrameIndex = styleSheet.insertRule(keyFrameStyle, styleSheet.cssRules.length)
    const classStyle = `.scale-up-down {
      animation-name: scaleupdown;
      animation-duration: ${duration}ms;
      transform-origin: ${centerX}px ${centerY}px; 
    }`
    const classStyleIndex = styleSheet.insertRule(classStyle, styleSheet.cssRules.length)
    this.addClass("scale-up-down")
    await asyncSleep(duration)
    this.removeClass("scale-up-down")
    styleSheet.deleteRule(classStyleIndex)
    styleSheet.deleteRule(keyFrameIndex)
  }
}

export class SVGRoot extends SVGElement {
  constructor() {
    super()
    this._node = document.createElementNS(xmlns, "svg")
  }

  viewBox(left, top, width, height) {
    return this.attr('viewBox', `${left} ${top} ${width} ${height}`)
  }

}

export class SVGDefs extends SVGElement {
  constructor() {
    super()
    this._node = document.createElementNS(xmlns, "defs")
  }


}

export class SVGImage extends SVGElement {
  constructor(href) {
    super()
    this._node = document.createElementNS(xmlns, "image")
    this._href = href
    this.attr('href', href)
  }

}

export class SVGCircle extends SVGElement {
  constructor(radius) {
    super()
    this._node = document.createElementNS(xmlns, "circle")
    this.radius = radius
    this.attr('r', radius)
  }

  move(x, y) {
    return this.attr('cx', x).attr('cy', y)
  }
}

export class SVGGroup extends SVGElement {
  constructor() {
    super()
    this._node = document.createElementNS(xmlns, "g")
  }

  move(x, y) {
    return this.attr('transform', `translate(${x} ${y})`)
  }
}

export class SVGText extends SVGElement {
  constructor(label) {
    super()
    this._node = document.createElementNS(xmlns, "text")
    this.text(label)
  }

  text(label) {
    this._node.textContent = label
    return this;
  }

  size(width, height) {
    //for text nodes, scale it
    const bbox = this._node.getBBox();
    const sx = width/bbox.width
    const sy = height/bbox.height
    return this.attr('transform', `scale(${sx} ${sy})`)
  }
}

export class SVGRect extends SVGElement {
  constructor(width, height) {
    super()
    this._node = document.createElementNS(xmlns, "rect")
    this.size(width, height)        
  }

  cornerRadius(r) {
    return this.attr('rx', r)
  }
 }

export class SVGUse extends SVGElement {
  constructor(defElement) {
    super()
    this._node = document.createElementNS(xmlns, "use")
    const refId = '#'+defElement.id(); 
    this.attr('href', refId)       
  }

}
