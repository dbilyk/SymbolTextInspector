var sketch = require("sketch")

var globals = {
  modalWidth       : 400,
  rowCounter       : 1,
  rowHeight        : 18,
  overrideNameColor: [0,0,0,0.9],
  labelColor       : [0,0,0,0.4],
  valueColor       : [0,0.3,0.7,0.7],
  panelColor       : [0.9,0.9,0.9,1]
}

var TextData = {
  "overrideName": "-",
  "Font Name"   : "-",
  "Font Size"   : "-",
  "Weight"      : "-",
  "Constraints" : "-",
  "H-Align"     : "-",
  "V-Align"     : "-",
  "Char Spacing": "-",
  "Line Height" : "-",
  "¶ Spacing"   : "-"
}


function main(ctx){
  let selection = sketch.fromNative(ctx.selection[0])
  if(selection.type != "SymbolInstance"){
    return
  }

  let localCopy   = selection.duplicate().detach()
  let allTextInfo = []

  //create content and scroll view objects
  var alert       = NSAlert.alloc().init()
  let contentView = NSView.alloc().init()
  let scrollView  = NSScrollView.alloc().init()
  //makes the y coordinates start in the top left and decend positive
  contentView.setFlipped(true)
  
  //assemble the text data into an array
  searchGroup(selection,localCopy,allTextInfo)
  
  
  //render data into contentView
  for(let i = 0; i<allTextInfo.length;i++){
    assembleAlertContent(allTextInfo[i], contentView)
  }

  //set the content size
  let totalHeight       = globals.rowCounter* globals.rowHeight
      contentView.frame = NSMakeRect(0,0,globals.modalWidth,totalHeight);

  //set scroll view size
  let scrollViewHeight = (totalHeight >= 300)?300:totalHeight

  scrollView.frame               = NSMakeRect(0,0,globals.modalWidth,scrollViewHeight)
  scrollView.backgroundColor     = getColor(globals.panelColor)
  scrollView.hasVerticalScroller = true
  scrollView.documentView        = contentView
  
  alert.messageText     = "Symbol Text Inspector"
  alert.informativeText = "Easily check the text specs without going into the symbol master."
  alert.accessoryView   = scrollView;

  var response = alert.runModal()

  if(response == 0){
    localCopy.remove()
  }

  
}

function searchGroup(symbolCopy, localCopy, dataArray){
  //check each layer name
  for(let i = localCopy.layers.length - 1; i >= 0 ;i--){
    let layer = localCopy.layers[i]

    if(layer.type == "SymbolInstance"){
      let symbol = layer.duplicate()
      let local  = layer.detach()
      searchGroup(symbol,local,dataArray)
    }

    //recursively search groups and compare to original symbol overrides symbol overrides 
    if(layer.type == "Group"){
      searchGroup(symbolCopy,layer,dataArray)
    }
    
    for(let j = symbolCopy.overrides.length-1; j>=0;j--){
      if(localCopy.layers[i].text == symbolCopy.overrides[j].value){
        let data = Object.create(TextData)
        let text = localCopy.layers[i]

        if(!text.sketchObject.style().textStyle()){
          data["overrideName"] = text.name
          data["Font Name"]    = "Font is missing."
          dataArray.push(data)
        }
        else{
          let font           = text.sketchObject.style().textStyle().attributes().NSFont
          let paragraphStyle = text.sketchObject.style().textStyle().attributes().NSParagraphStyle
          let kern           = text.sketchObject.style().textStyle().attributes().NSKern
          let size           = font.pointSize()
          let family         = font.familyName()
          let weight         = NSFontManager.sharedFontManager().weightOfFont_(font)
          let pSpacing       = paragraphStyle.paragraphSpacing()
          let minLineHeight  = paragraphStyle.minimumLineHeight()
          let hAlign         = titleWord(text.alignment)
          let vAlign         = text.sketchObject.style().textStyle().verticalAlignment()

          switch(vAlign){
            case 0: vAlign = "Top"; break;
            case 1: vAlign = "Middle"; break;
            case 2: vAlign = "Bottom"; break;

          }
          
          //populate the data structure
          data["overrideName"] = text.name
          data["Font Name"]    = family
          data["Font Size"]    = size
          data["Weight"]       = weight
          data["H-Align"]      = hAlign
          data["V-Align"]      = vAlign
          data["Constraints"]  = (text.fixedWidth)?"Fixed":"Auto"
          data["Kerning"]      = Math.round(kern*100)/100
          data["Line Height"]  = (minLineHeight != 0)? minLineHeight : "Default"
          data["¶ Spacing"]    = pSpacing

          dataArray.push(data)
        }
      }
    }
  }
}



function assembleAlertContent(textInfo, content){
  
  
  let overrideNameLabel   = createLabel(textInfo["overrideName"],16,NSMakeRect(0,globals.rowCounter*globals.rowHeight-5,200,globals.rowHeight+10),true,globals.overrideNameColor)
      globals.rowCounter += 1
  
  //puts font name on its own line
  labelPair(Object.keys(textInfo)[1], textInfo["Font Name"], 1, globals.rowCounter, content)
  globals.rowCounter += 1

  content.addSubview(overrideNameLabel)

  let keys = Object.keys(textInfo)
  
  for(let i = 2; i< keys.length; i++){

    let key    = keys[i]
    let value  = textInfo[key]
    let column = (i%2 == 0)?1:2
    
    if(i%2==0 && i!=2){
      globals.rowCounter += 1
    }
    
    labelPair(key, value, column, globals.rowCounter, content)
  }

  //the plus one adds a row of padding between overrides
  globals.rowCounter += 2
  return content
}
         
function labelPair(valLeft, valRight, col, row, alertContent){
  let labelSpacing = 75
  let labelSize    = 11
  let colVal       = (col ==1) ? 10:globals.modalWidth/2
  let rowVal       = row * globals.rowHeight

  let labelLeft  = createLabel(valLeft, labelSize, NSMakeRect(colVal, rowVal, 200, globals.rowHeight),true,globals.labelColor)
  let labelRight = createLabel(valRight, labelSize, NSMakeRect(colVal + labelSpacing, rowVal, 200, globals.rowHeight),false,globals.valueColor)

  alertContent.addSubview(labelLeft)
  alertContent.addSubview(labelRight)

}

function createLabel(text,size,frame, isBold, col) {
	var label = NSTextField.alloc().initWithFrame(frame);
  label.setStringValue(text);
  label.textColor = getColor(col)
	label.setFont((isBold)?NSFont.boldSystemFontOfSize(size):NSFont.systemFontOfSize(size));
	label.setBezeled(false);
	label.setDrawsBackground(false);
	label.setEditable(false);
	label.setSelectable(false);

	return label;
}

function getColor(rgbaArray){
  return NSColor.colorWithCalibratedRed_green_blue_alpha(rgbaArray[0],rgbaArray[1],rgbaArray[2],rgbaArray[3])
}

function titleWord(string){
  return string.charAt(0).toUpperCase() + string.slice(1)
}