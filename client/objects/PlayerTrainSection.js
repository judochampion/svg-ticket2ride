import { toast } from "../helpers/game_helper"
import TrainCard from "./TrainCard"


const TOP = 940
const LEFT = 20

const SECTION_HEIGHT = 110
const SECTION_WIDTH = 920 
const SCROLL_OFFSET = 50;

export default class PlayerTrainSection {

  constructor(game) {
    this.game = game
    this.location = 'playertrain';
    this.deck = []
    // this.init()
    this.initEvents()
  }

  init() {
    this.maskGraphics = this.scene.make.graphics()
    this.maskRect = new Phaser.Geom.Rectangle(LEFT, TOP-10, SECTION_WIDTH, SECTION_HEIGHT+10);
    this.maskGraphics.fillRectShape(this.maskRect)
    this.mask = new Phaser.Display.Masks.GeometryMask(this.scene, this.maskGraphics)
    this.container = this.scene.add.container(LEFT, TOP)
    this.container.setMask(this.mask)
    this.rightArrow = this.scene.add.triangle(LEFT+SECTION_WIDTH-10, TOP+SECTION_HEIGHT+10, 
                                                    0, 0, 0, 20, 20, 10, 0x00FFFF)
                        .setInteractive();

    this.leftArrow = this.scene.add.triangle(LEFT+10, TOP+SECTION_HEIGHT+10, 
                                                      0, 10, 20, 20, 20, 0, 0x00FFFF)
                      .setInteractive();
  }

  scrollContainer(offset) {
    const bounds = this.container.getBounds();
    const min = bounds.width > SECTION_WIDTH ? LEFT+SECTION_WIDTH-bounds.width: LEFT 
    const max = LEFT
    this.container.x = PhaserMath.Clamp(this.container.x + offset, 
                            min, max)
    this.rightArrow.setVisible(this.container.x > min)
    this.leftArrow.setVisible(this.container.x < max)
  }

  async setCards() {
    const cards = this.game.context.me.cards;
    cards.sort((a,b)=>{
      let r = a.localeCompare(b)
      if(r == 0) return r;
      if(a == 'rainbow') return 1;
      if(b == 'rainbow') return -1;
      return r;
    });
    const oldLength = this.deck.length;
    const newLength = cards.length;
    const count = Math.max(oldLength, newLength)
    for(let i=0;i<count;i++) {
      if(i >= newLength) {
        //remove it from deck
        this.deck[i].destroy();
        this.deck[i] = null;
        continue;
      }
      const color = cards[i]
      if(i < oldLength) {
        if(color == this.deck[i].color && this.deck[i].hasImage()) continue; //same color, keep it
        this.deck[i].destroy()  //diff color destroy
      }
      const card = new TrainCard(this.game, color, true)
                        .setInteractive()
      if(i < oldLength)
        this.deck[i] = card;  //new card
      else
        this.deck.push(card)
    }
    this.deck.length = newLength;
    this.render()
  }

  cleanup() {
    this.deck.forEach(c=>c.hasImage() && c.destroy())
    delete this.deck
    // this.container.clearMask()
    // this.container.destroy()
    // this.maskGraphics.destroy()
    // this.mask.destroy()
    // this.leftArrow.destroy()
    // this.rightArrow.destroy()
  }

  async moveCard(card) {
    const x = LEFT
    const y = TOP
    await card.moveTo(x, y, true)
    card.destroy()
  }

  render() {
    // this.container.removeAll()

    this.counter = {
      black: 0,
      white: 0,
      red: 0,
      orange: 0,
      purple: 0,
      yellow: 0,
      green: 0,
      blue: 0,
      rainbow: 0
    }

    if(this.deck.length == 0) return false;
    let prevColor = null;
    let x = LEFT;
    const y = TOP; 
    const GUTTER_SMALL = 20
    const GUTTER_BIG = 70

    for(let card of this.deck) {
      if(prevColor) {
        x += prevColor == card.color ? GUTTER_SMALL : GUTTER_BIG;
      }
      card.setPosition(x, y, true)
      card.setLocation(this.location)
      prevColor = card.color
      this.counter[card.color]++;
      // this.container.add(card.image)
    }
    // this.scrollContainer(0)
  }

  initEvents() {
    const game = this.game;
    const { socket, context, rootSVG } = game;
    const boardSection = game.boardSection;

    const isFullyVisible = (card)=>{
      // const x = this.container.x + card.left
      // const y = this.container.y + card.top
      // const rect = new Phaser.Geom.Rectangle(x+0.01, y+0.01, card.width-0.02, card.height-0.02)
      // return Phaser.Geom.Rectangle.ContainsRect(this.maskRect, rect)
      return true
    }

    const cardMouseOver = (e)=>{
      const card = e.detail
      if(canDoAction() && card && card.location == this.location && isFullyVisible(card)) {
        card.image.addClass("highlight-box")
      }
    }

    const cardMouseOut = (e)=>{
      const card = e.detail
      if(card && card.location == this.location) {
        card.image.removeClass("highlight-box")
      }
    }

    const canDoAction = () => {
      if(game.isGameOver()) return false;
      if(!context.myTurn) return false;
      if(context.actionCount == 0) return true;
      return context.actionName == "claim-route";
    }

    const hasCardsToClaim = (route) => {
      const routeColor = route[0].color
      if(routeColor == 'gray') {
        const cv = Object.values(this.counter)
        //assumes last entry is rainbow
        const count = Math.max(...cv.slice(0, -1))+cv.at(-1)
        return count >= route.length
      }
      else {
        return (this.counter[routeColor]+this.counter.rainbow) >= route.length;
      }
    }
  
    const performCardAction = (card) => {
      const cardImage = card.image
      cardImage.bringToFront()
      cardImage.incY(-10)
      context.actionName = 'claim-route'
      context.actionCount++;
      rootSVG.attr("cursor", "crosshair")
      context.selectedCard = card
    }

    const undoCardAction = () => {
      const card = context.selectedCard;
      card.image.incY(10)
      context.actionCount--;
      context.actionName = context.actionCount > 0 ? "claim-route" : "start";
      context.selectedCard = null;
      rootSVG.attr("cursor", "default")
      this.render();
    }

    let inProgress = false;

    const claimRoute = async (newContext) => {
      const { routeIndex, index } = newContext.actionData;

      const coinColor = context.players[context.currentPlayerIndex].color;
      boardSection.renderCoinWithAnimation(coinColor, routeIndex, index)
      // if(context.myTurn) {
      //   await scene.closeDeckSection.moveCard(context.selectedCard)
      //   context.selectedCard = null;
      //   input.setDefaultCursor("default")
      // } 
      // else {
      //   await scene.playersSection.moveCardToClose(context.currentPlayerIndex)
      // }
      game.setContext(newContext)
      // scene.playersSection.updateCurrentPlayerCoins();
      inProgress = false;
    }

    const canClaimRoute = (routeIndex, index) => {
      const route = boardSection.getRoute(routeIndex);
      const routeColor = route[0].color
      const segment = route[index]
      const cardColor = context.selectedCard.color
      if(segment.coinColor) {
        toast(game, "Coin already placed!")
        return false
      }
      if(context.selectedRouteIndex < 0) { //first pin
        //check if pins are avail
        if(cardColor != 'rainbow' && routeColor != 'gray' && routeColor != cardColor) {
          toast(game, `Color mismatch ${cardColor} vs ${routeColor}`)
          return false;
        }
        if(!hasCardsToClaim(route)) {
          toast(game, "Insufficient matching cards to claim route!")
          return false
        }
        if(route.length > context.me.coins) {
          toast(game, "Not enough coins to claim route!")
          return false
        }
        if(routeColor == 'gray') {  //any card will fix
          return true
        }
        return true;
      }
      
      if(context.selectedRouteIndex != routeIndex) {
        toast(game, "Cannot claim multiple routes in one turn!")
        return false;
      }
      if(cardColor == 'rainbow') {
        return true
      } 
      if(routeColor != 'gray') {
        if(routeColor != cardColor) {
          toast(game, `Color mismatch ${cardColor} vs ${routeColor}`)
          return false
        }
        return true
      }
      if(context.grayRouteColor && cardColor != context.grayRouteColor) {
        toast(game, `Cannot mix colors in gray route`)
        return false
      }
      return true
    }

    const sendAction = (routeIndex, index, selectedCardColor )=> {
      inProgress = true;
      const route = boardSection.getRoute(routeIndex);
      const routeColor = route[0].color; 
      game.do("claim-route", { routeLength: route.length, routeIndex, index, selectedCardColor, routeColor })
    }

    const cardClick = async (e)=>{
      if(inProgress) return false;
      const card = e.detail
      if(canDoAction() && card && card.location == this.location && isFullyVisible(card)) {
        card.image.removeClass("highlight-box")
        if((context.actionCount % 2) == 0) {
          inProgress = true;
          performCardAction(card)
          inProgress = false
          return true
        }
        else {
          undoCardAction();
        }
      }
      // const [routeIndex=-1, index] = gameObject.getData(['routeIndex', 'index'])
      // if(canDoAction() && routeIndex >= 0 && context.selectedCard && 
      //     canClaimRoute(routeIndex, index)) {
      //   sendAction(routeIndex, index, context.selectedCard.color)
      // }
      // if(gameObject == this.rightArrow) {
      //   this.scrollContainer(-SCROLL_OFFSET);
      // }
      // if(gameObject == this.leftArrow) {
      //   this.scrollContainer(SCROLL_OFFSET);
      // }
    }
 
    const segmentClick = async (e)=>{
      if(inProgress) return false;
      const segment = e.detail
      const {routeIndex=-1, index} = segment.data()
      if(canDoAction() && routeIndex >= 0 && context.selectedCard && 
          canClaimRoute(routeIndex, index)) {
         sendAction(routeIndex, index, context.selectedCard.color)
      }
    }

    document.addEventListener("card-mouseover", cardMouseOver);
    document.addEventListener("card-mouseout", cardMouseOut);
    document.addEventListener("card-click", cardClick);    
    document.addEventListener("segment-click", segmentClick);    
    socket.on("claim-route", claimRoute);
  }

}
