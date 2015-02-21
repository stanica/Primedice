var UI = require('ui');
var Settings = require('settings');
var Vector2 = require('vector2');
var ajax = require('ajax');
var userName = localStorage.getItem("userName");
var password = localStorage.getItem("password");
var accessToken = "";
var userStats = [];
var betValue = 32;
var baseBet = localStorage.getItem("baseBet") || 1;
var targetValue =  localStorage.getItem("targetValue") || 50;
var selected = "none";
var index = 1;
var oldIndex = 1;

Settings.config(
  { url: 'www.stanica.ca/primedice.html' },
    function(e) {
      textfield.text("Login or register");
      var position = new Vector2(0, 45);
      textfield.position(position);
       logonWindow.show();
    },
    function(e) {
    
    var mode = JSON.parse(JSON.stringify(e.options)).mode;
    if (mode === "login"){
      userName = JSON.parse(JSON.stringify(e.options)).username;
      localStorage.setItem('userName', userName);
      password = JSON.parse(JSON.stringify(e.options)).password;  
      localStorage.setItem('password', password);
      accessToken = JSON.parse(JSON.stringify(e.options)).accessToken;  
    }
    else if (mode === "register"){
      userName = JSON.parse(JSON.stringify(e.options)).username;
      localStorage.setItem('userName', userName);
      password = JSON.parse(JSON.stringify(e.options)).password;  
      localStorage.setItem('password', password);
      accessToken = JSON.parse(JSON.stringify(e.options)).accessToken;
    }  
    getUserInfo("init");
    logonWindow.hide();
    menu.show();
      
    if (e.failed) {
      if (!userName && password){
        logonWindow.hide();
      }
    }
  }
);
    
function getBTC(num){
  num = parseInt(num)/100000000;
  return num.toFixed(8) + " BTC";
}

function updateAccessToken() {
  ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20htmlpost%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Flogin'%20%0Aand%20postdata%3D%22username%3D"+userName+"%26password%3D"+password+"%22%20and%20xpath%3D%22%2F%2Fp%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      accessToken = JSON.parse(JSON.parse(data).query.results.postresult.p).access_token;
      logonWindow.hide();
      menu.show();
      getUserInfo("init");
      //betWindow.show();
    },
    function(error) {
      // Failure!
      console.log('Failed fetching data: ' + error);
    }
  );
}

function getUserInfo(state){
  ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Fusers%2F1%3Faccess_token%3D"+accessToken+"'%20and%20xpath%3D'%2F%2Fp'&format=json&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      while (userStats.length > 0){
        userStats.pop();
      }
      var query = JSON.parse(JSON.parse(data).query.results.p).user;
      userStats.push({title:'User name', subtitle:query.username});
      userStats.push({title:'Balance', subtitle:getBTC(query.balance)});
      userStats.push({title:'Wins', subtitle:query.wins});
      userStats.push({title:'Losses', subtitle:query.losses});
      userStats.push({title:'Bets', subtitle:query.bets});
      userStats.push({title:'Wagered', subtitle:getBTC(query.wagered)});
      userStats.push({title:'Profit', subtitle:getBTC(query.profit)});
      userStats.push({title:'BTC Address', subtitle:query.address});
      if (state == "showInfo"){
        loadingWindow.hide();
        userStatsMenu.show();
      }
      if(state == "init"){
        initBetWindow();
      }
    },
    function(error) {
      // Failure!
      console.log('Failed fetching data: ' + error);
    }
  );
}

function placeBet (amount, chance, callback){
  ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20htmlpost%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Fbet%3Faccess_token%3D"+accessToken+"'%20%0Aand%20postdata%3D%22amount%3D"+amount+"%26target%3D"+chance+"%26condition%3D%3C%22%20and%20xpath%3D%22%2F%2Fp%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      var newBalance = JSON.parse(JSON.parse(data).query.results.postresult.p).user.balance;
      var win = JSON.parse(JSON.parse(data).query.results.postresult.p).bet.win;
      callback(newBalance, win);
    },
    function(error) {
      // Failure!
      console.log('Failed fetching data: ' + error);
    }
  );
}

var menu = new UI.Menu({
  sections: [{
    items: [{
      title: 'Bet',
      icon: 'images/dice.png',
      subtitle: 'Place a bet'
    }, {
      title: 'User Info',
      icon: 'images/info.png',
      subtitle: 'Get stats and info'
    },{
      title: 'Settings',
      icon: 'images/gear.png',
      subtitle: 'Extra settings'
    }]
  }]
});

//Main menu
menu.on('select', function(e) {
  if(e.itemIndex == 0){
    betWindow.show();
  }
  else if(e.itemIndex == 1){
    loadingWindow.show();
    getUserInfo("showInfo");
  }
  else if(e.itemIndex == 2){
    initSettingsMenu();
    settingsMenu.show();
  }
});

var userStatsMenu = new UI.Menu({
  sections: [{
    title: "Your information",
    items: userStats
  }]
});

userStatsMenu.on('select', function(e) {
  if (e.itemIndex == 7){
    var addressWindow = new UI.Window();
    var addressText = new UI.Text({
      position: new Vector2(0,40),
      size: new Vector2(144,30),
      font: 'gothic-24',
      text: userStats[7].subtitle,
      textAlign: 'left'
    });
    addressWindow.add(addressText);
    addressWindow.show();
  }   
});

//Window shown when username/password does not exist
var newLogonWindow = new UI.Window();
//Window shown when username/password exists
var logonWindow = new UI.Window();
var textfield = new UI.Text({
  position: new Vector2(0, 50),
  size: new Vector2(144, 50),
  font: 'gothic-24-bold',
  text: 'Logging you in...',
  textAlign: 'center'
});
logonWindow.add(textfield);

//Window shown while loading user stats
var loadingWindow = new UI.Window();
var loadingText = new UI.Text({
  position: new Vector2(0,50),
  size: new Vector2(144,30),
  font: 'gothic-24-bold',
  text: 'Loading...',
  textAlign: 'center'
});
loadingWindow.add(loadingText);

//Set up settings menu
  var settingsMenu = new UI.Menu({
    sections: [{
      title: 'Settings',
      items: [{
        title: 'Base bet',
        subtitle: 'Set your base bet'
      }]
    }]
  });
function initSettingsMenu(){
  var setBaseBetWindow = new UI.Window();
  var baseBetInstructions = new UI.Text({
    position: new Vector2(0,27),
    size: new Vector2(144,80),
    font: 'gothic-14',
    text: 'Middle click and hold on the amount field in the bet window to set this value. Click up to increase, down to decrease.',
    textAlign: 'center',
    color: 'black'
  });
  var walletText = new UI.Text({
    position: new Vector2(-1,0),
    size: new Vector2(146,24),
    font: 'gothic-18',
    text: 'Wallet: ' + Number(userStats[1].subtitle.split(" ")[0]).toFixed(8) +' BTC',
    textAlign: 'center',
    color: 'black',
    borderColor: 'black'
  });
  var baseBetText = new UI.Text({
    position: new Vector2(0,110),
    size: new Vector2(144,30),
    font: 'gothic-24-bold',
    text: baseBet,
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'black'
  });
  var background = new UI.Rect({ 
    size: new Vector2(144, 168) 
  });
  setBaseBetWindow.add(background);
  setBaseBetWindow.add(baseBetInstructions);
  setBaseBetWindow.add(walletText);
  setBaseBetWindow.add(baseBetText);
  setBaseBetWindow.on('click', 'up', function(e){
    if (baseBet + 1 <= (userStats[1].subtitle.split(" ")[0] * 100000000) / 2){
      baseBetText.text(++baseBet);
      localStorage.setItem('baseBet', baseBet);
    }
  });
  setBaseBetWindow.on('longClick','up',function(e){
    if (baseBet * 2 <= (userStats[1].subtitle.split(" ")[0] * 100000000) / 2){
      baseBet = baseBet * 2;
      baseBetText.text(baseBet);
      localStorage.setItem('baseBet', baseBet);
    }
  });
  setBaseBetWindow.on('click', 'down', function(e){
    if (baseBet - 1 >= 1){
      baseBetText.text(--baseBet);
      localStorage.setItem('baseBet', baseBet);
    }
  });
  setBaseBetWindow.on('longClick','down',function(e){
    if (baseBet / 2 >= 1){
      baseBet = Math.floor(baseBet/2);
      baseBetText.text(baseBet);
      localStorage.setItem('baseBet', baseBet);
    }
  });
  settingsMenu.on('select', function(e){
    if (e.itemIndex === 0){
      setBaseBetWindow.show();
    }
  });
}
//Set up bet window
var betWindow = new UI.Window();
function initBetWindow(){
  //Variables for positioning text
  var atx = 10;
  var avx = 64;
  var ctx = 10;
  var cvx = 100;
  var ptx = 10;
  var pvx = 80;
  var aty = 30;
  var avy = 30;
  var cty = 55;
  var cvy = 55;
  var pty = 80;
  var pvy = 80;
  var btx = 40;
  var bty = 110;
  var wtx = 0;
  var wty = 2;
  var walletText = new UI.Text({
    position: new Vector2(wtx,wty),
    size: new Vector2(144,30),
    font: 'gothic-18',
    text: 'Wallet: ' + Number(userStats[1].subtitle.split(" ")[0]).toFixed(8) +' BTC',
    textAlign: 'center',
    color: 'white'
  });
   var ruler = new UI.Rect({
     position: new Vector2(0, 5),
     size: new Vector2(144,19),
     backgroundColor: 'black'
   }); 
  var amountText = new UI.Text({
    position: new Vector2(atx,aty),
    size: new Vector2(144,30),
    font: 'gothic-18',
    text: 'Amount: ',
    textAlign: 'left',
    color: 'black'
  });
  var amountValue = new UI.Text({
    position: new Vector2(avx,avy),
    size: new Vector2(70,20),
    font: 'gothic-18',
    text: betValue,
    textAlign: 'right',
    color: 'black',
    borderColor: 'black'
  });
  var chanceText = new UI.Text({
    position: new Vector2(ctx,cty),
    size: new Vector2(144,30),
    font: 'gothic-18',
    text: 'Chance: ',
    textAlign: 'left',
    color: 'black'
  });
  var chanceValue = new UI.Text({
    position: new Vector2(cvx,cvy),
    size: new Vector2(34,20),
    font: 'gothic-18',
    text: targetValue + "%",
    textAlign: 'right',
    color: 'black'
  });
  var payoutText = new UI.Text({
    position: new Vector2(ptx,pty),
    size: new Vector2(144,30),
    font: 'gothic-18',
    text: 'Payout: ',
    textAlign: 'left',
    color: 'black'
  });
  var payoutValue = new UI.Text({
    position: new Vector2(pvx,pvy),
    size: new Vector2(54,20),
    font: 'gothic-18',
    text: (99 / targetValue).toFixed(3) + "x",
    textAlign: 'right',
    color: 'black'
  });
  var betText = new UI.Text({
    position: new Vector2(btx,bty),
    size: new Vector2(71, 30),
    font: 'gothic-24-bold',
    text: 'Roll Dice',
    textAlign: 'center',
    color: 'black',
    backgroundColor: 'white',
    borderColor: 'black'
  });
  var buttonOutline = new UI.Rect({
    position: new Vector2(btx,bty+5),
    size: new Vector2(71, 27),
    borderColor: 'black'
  });
  var background = new UI.Rect({ 
    size: new Vector2(144, 168) 
  });
  betWindow.add(background);
  betWindow.add(ruler);
  betWindow.add(walletText);
  betWindow.add(amountText);
  betWindow.add(amountValue);
  betWindow.add(chanceText);
  betWindow.add(payoutText);
  betWindow.add(payoutValue);
  betWindow.add(chanceValue);
  betWindow.add(buttonOutline);
  betWindow.add(betText);
  
  var Arrow = function(orientation, x, y){  
    if (orientation === "up"){
      this.top = new UI.Rect({
        position: new Vector2(x,y),
        size: new Vector2(3,3),
        backgroundColor: 'black'
      });
      this.mid = new UI.Rect({
        position: new Vector2(x-3,y+3),
        size: new Vector2(9,3),
        backgroundColor: 'black'
      });
      this.bot = new UI.Rect({
        position: new Vector2(x-6,y+6),
        size: new Vector2(15,3),
        backgroundColor: 'black'
      });
      this.lower = new UI.Rect({
        position: new Vector2(x-9,y+9),
        size: new Vector2(21,3),
        backgroundColor: 'black'
      });
      this.stick = new UI.Rect({
        position: new Vector2(x-3,y+6),
        size: new Vector2(9,23),
        backgroundColor: 'black'
      });
    }
    else if (orientation === "down"){
       this.top = new UI.Rect({
        position: new Vector2(x,y),
        size: new Vector2(3,3),
        backgroundColor: 'black'
      });
      this.mid = new UI.Rect({
        position: new Vector2(x-3,y-3),
        size: new Vector2(9,3),
        backgroundColor: 'black'
      });
      this.bot = new UI.Rect({
        position: new Vector2(x-6,y-6),
        size: new Vector2(15,3),
        backgroundColor: 'black'
      });
      this.lower = new UI.Rect({
        position: new Vector2(x-9,y-9),
        size: new Vector2(21,3),
        backgroundColor: 'black'
      });
      this.stick = new UI.Rect({
        position: new Vector2(x-3,y-29),
        size: new Vector2(9,23),
        backgroundColor: 'black'
      });
    }
    this.createArrow();
  };
  Arrow.prototype.createArrow = function(){
      betWindow.add(this.top);
      betWindow.add(this.mid);
      betWindow.add(this.bot);
      betWindow.add(this.lower);
      betWindow.add(this.stick);
    };
  Arrow.prototype.removeArrow = function(){
      betWindow.remove(this.top);
      betWindow.remove(this.mid);
      betWindow.remove(this.bot);
      betWindow.remove(this.lower);
      betWindow.remove(this.stick);
    }; 
  betWindow.on('click', 'up', function(e) {
    if (selected === "amount"){
      if (betValue + 1 <= (userStats[1].subtitle.split(" ")[0] * 100000000)){
        betValue ++;
      }
      amountValue.color('white');
      amountValue.backgroundColor('black');
      amountValue.text(betValue);
    }
    else if (selected == "chance"){
      if (targetValue + 1 <= 98) {
        targetValue ++;
      }
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
      chanceValue.text(targetValue + "%");
      payoutValue.text((99 / targetValue).toFixed(3) + "x");
      localStorage.setItem('targetValue', targetValue);
    }
    else {
      oldIndex = index;
      index--;
      if (index < 1){
        index = 3;
      }
      if (oldIndex == 1){
        amountValue.text(betValue);
        amountValue.color('black');
        amountValue.borderColor('clear');
        betText.color('white');
        betText.backgroundColor('black');
      }
      else if (oldIndex == 2){
        chanceValue.text(targetValue + "%");
        chanceValue.color('black');
        amountValue.text(betValue);
        chanceValue.borderColor('clear');
        amountValue.color('black');
        amountValue.borderColor('black');
      }
      else if (oldIndex == 3){
        betText.color('black');
        betText.backgroundColor('white');
        betText.borderColor('black');
        chanceValue.text(targetValue + "%");
        chanceValue.color('black');
        chanceValue.borderColor('black');
      }
    }
  });
  betWindow.on('click','down', function(e){
    if (selected === "amount"){
      if (betValue - 1 >= 1){
        betValue --;
      }
      amountValue.text(betValue);
      amountValue.color('white');
      amountValue.backgroundColor('black');
    }
    else if (selected == "chance"){
      if (targetValue - 1 >= 1) {
        targetValue --;
      }
      chanceValue.text(targetValue + "%");
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
      payoutValue.text((99 / targetValue).toFixed(3) + "x");
      localStorage.setItem('targetValue"', targetValue);
    }
    else {
      oldIndex = index;
      index++;
      if (index > 3){
        index = 1;
      }
      if (oldIndex == 1){
        amountValue.text(betValue);
        amountValue.color('black');
        amountValue.borderColor('clear');
        chanceValue.text(targetValue + "%");
        chanceValue.color('black');
        chanceValue.borderColor('black');
      }
      else if (oldIndex == 2){
        chanceValue.text(targetValue + "%");
        chanceValue.color('black');
        chanceValue.borderColor('clear');
        betText.color('white');
        betText.backgroundColor('black');
      }
      else if (oldIndex == 3){
        betText.color('black');
        betText.backgroundColor('white');
        betText.borderColor('black');
        amountValue.text(betValue);
        amountValue.color('black');
        amountValue.borderColor('black');
      }
    }
  });
  betWindow.on('longClick','up',function(e){
    if (selected === "amount"){
      if (betValue * 2 < (userStats[1].subtitle.split(" ")[0] * 100000000)){
        betValue = betValue * 2;
      }
      amountValue.color('white');
      amountValue.backgroundColor('black');
      amountValue.text(betValue);
    }
    else if (selected == "chance"){
      if (targetValue + 5 <= 98) {
        targetValue += 5;
      }
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
      chanceValue.text(targetValue + "%");
      payoutValue.text((99 / targetValue).toFixed(3) + "x");
      localStorage.setItem('targetValue"', targetValue);
    }
  });
  betWindow.on('longClick','down',function(e){
     if (selected === "amount"){
      if (Math.floor(betValue/2) >= 1){
        betValue = Math.floor(betValue/2);
      }
      amountValue.text(betValue);
      amountValue.color('white');
      amountValue.backgroundColor('black');
    }
    else if (selected == "chance"){
      if (targetValue - 5 >= 1) {
        targetValue -=5;
      }
      chanceValue.text(targetValue + "%");
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
      payoutValue.text((99 / targetValue).toFixed(3) + "x");
      localStorage.setItem('targetValue"', targetValue); 
    }
  });
  betWindow.on('longClick', 'select', function(e){
    if (selected === "amount"){
      betValue = baseBet;
      amountValue.text(baseBet);
    }
  });
  betWindow.on('click', 'select', function(e){
    if (index == 1 && selected != "amount"){
      selected = "amount";
      amountValue.text(betValue);
      amountValue.color('white');
      amountValue.backgroundColor('black');
    }
    else if (index == 2 && selected != "chance"){
      selected = "chance";
      chanceValue.text(targetValue + "%");
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
    }
    else if (index == 3){
      selected = "bet";
      var click = betText.position();
      click.y += 2;
      betText.animate('position', click, 100).queue(function(next){
        click.y-=2;
        this.animate('position', click, 100);
        next();
      });
      placeBet(betValue, targetValue, updateWallet);
    }
    else{
      selected = "none";
      if (index == 1){
        amountValue.text(betValue);
        amountValue.color('black');
        amountValue.backgroundColor('white');
        amountValue.borderColor('black');
      }
      else if (index == 2){
        chanceValue.text(targetValue + "%");
        chanceValue.color('black');
        chanceValue.backgroundColor('white');
        chanceValue.borderColor('black');
      }
    }
  });
  function updateWallet(value, win){
    ruler.backgroundColor('white');
    walletText.color('black');
    walletText.text("Wallet: " + getBTC(value));
    setTimeout(function(){
      ruler.backgroundColor('black');
      walletText.color('white');
    },300);
    if (win === true){
      var fArrow = new Arrow("up",17,110);
      var sArrow = new Arrow("up",126,110);
      setTimeout(function(){
        fArrow.removeArrow();
        sArrow.removeArrow();
      },300);
    }
    else{
      var fArrow = new Arrow("down",17,140);
      var sArrow = new Arrow("down",126,140);
      setTimeout(function(){
        fArrow.removeArrow();
        sArrow.removeArrow();
      },300);
    }
  }
}

if (userName && password){
  logonWindow.show();
  updateAccessToken();
}
else {
  textfield.text("Login through app settings on your phone");
  var position = new Vector2(0, 35);
  textfield.position(position);
  logonWindow.show();
}