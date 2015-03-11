var UI = require('ui');
var Settings = require('settings');
var Vector2 = require('vector2');
var Vibe = require('ui/vibe');
var ajax = require('ajax');
var userName = localStorage.getItem("userName");
var password = localStorage.getItem("password");
var accessToken = "";
var userStats = [];
var betValue = 1;
var baseBet = localStorage.getItem('baseBet') || 1;
var targetValue =  localStorage.getItem('targetValue') || 49;
var selected = 'none';
var index = 1;
var oldIndex = 1;
var maxRolls = localStorage.getItem('maxRolls') || 500;
maxRolls = maxRolls === '0' ? 0 : maxRolls;
var onLossReturn = localStorage.getItem('onLossReturn') === 'True' ? true : false;
var onLossIncreaseBy = localStorage.getItem('onLossIncreaseBy') || 0;
var onWinReturn = localStorage.getItem('onWinReturn') === 'True' ? true : false;
var onWinIncreaseBy = localStorage.getItem('onWinIncreaseBy') || 0;
var botIndex = 1;
var botOldIndex = 1;
var botSelected = 'none';
var botState = 'stopped';
var botTargetValue = Number(localStorage.getItem('botTargetValue')) || 49;
var lastBets = [];
var currentRolls = 0;

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
    logonWindow.hide();
    menu.show();
      
    if (e.failed) {
      if (userName && password){
        logonWindow.hide();
      }
    }
  }
);

//Helper function that converts numbers to BTC
function getBTC(num){
  num = parseInt(num)/100000000;
  return num.toFixed(8) + " BTC";
}

//Helper function to update all wallets
function updateWallets(value){
  baseBetWalletText.text('Wallet: ' + getBTC(value));
  autoBetWalletText.text('Wallet: ' + getBTC(value));
  walletText.text('Wallet: ' + getBTC(value));
}

function updateAccessToken() {
  ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20htmlpost%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Flogin'%20%0Aand%20postdata%3D%22username%3D"+userName+"%26password%3D"+password+"%22%20and%20xpath%3D%22%2F%2Fp%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      if (JSON.parse(data).query.results.postresult.p.length == 2){
        errorMessage.text(JSON.parse(data).query.results.postresult.p[1].content);
        errorWindow.show();
      }
      else if (JSON.parse(JSON.parse(data).query.results.postresult.p).access_token.length > 5){
        accessToken = JSON.parse(JSON.parse(data).query.results.postresult.p).access_token;
        logonWindow.hide();
        menu.show();
        getUserInfo("init");
      }
    },
    function(error) {
      // Failure!
      errorMessage.text('Network issue. Try again.');
      errorWindow.show();
      console.log('Failed fetching data: ' + error);
    }
  );
}

function getUserInfo(state){
  if (state === undefined) state = 'refresh';
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
      if (state === 'showInfo'){
        loadingWindow.hide();
        userStatsMenu.show();
      }
      else if(state === 'init'){
        initBetWindow();
        initBotSettings();
        initBaseBetSettings();
        initAutoBet();
      }
      else if (state === 'updateBetWallet'){
        baseBetWalletText.text('Wallet: ' + getBTC(query.balance));
        loadingWindow.hide();
        betWindow.show();
      }
      else if (state === 'updateBotWallet'){
        autoBetWalletText.text('Wallet: ' + getBTC(query.balance));
        loadingWindow.hide();
        autoBetWindow.show();
      }
      else if (state === 'updateBaseBetWallet'){
        baseBetWalletText.text('Wallet: ' + getBTC(query.balance));
        loadingWindow.hide();
        setBaseBetWindow.show();
      }
    },
    function(error) {
      // Failure!
      errorMessage.text('Network issue. Try again.');
      errorWindow.show();
      console.log('Failed fetching data: ' + error);
    }
  );
}

function placeBet (amount, chance, state, callback){
  ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20htmlpost%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Fbet%3Faccess_token%3D"+accessToken+"'%20%0Aand%20postdata%3D%22amount%3D"+amount+"%26target%3D"+chance+"%26condition%3D%3C%22%20and%20xpath%3D%22%2F%2Fp%22&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      console.log(data);
      // Server will sometimes return null after placing a bet. Bet still goes through
      // so the last bet needs to be retrieved before placing a new one.
      if (state === 'auto_bet' && JSON.parse(data).query.results === 'null' || JSON.parse(data).query.results === null){
        console.log('Server returned null');
        setTimeout(function(){
          getLastBets('null', callback);
        }, 2500);
      }
      // Server will sometimes return nginx version after placing a bet. Bet does
      // not go through so it needs to be placed again without decreasing counter.
      else if (JSON.parse(data).query.results.postresult.p === 'nginx/1.4.6 (Ubuntu)'){
        console.log('Server returned nginx version');
        setTimeout(function(){
          currentRolls++;
          placeBet(amount, chance, state, callback);
        }, 2500);
      }
      else {
        if (JSON.parse(data).query.results.postresult.p === 'Insufficient funds'){
          if (state === 'auto_bet'){
            errorMessage.text('Insufficient funds');
            errorMessage.position(new Vector2(0,50));
            errorWindow.show();
            callback(0,0,0,'stop');
          }
          else {
            errorMessage.position(new Vector2(0,50));
            errorMessage.text('Insufficient funds');
            errorWindow.show();
          }
        }
        else {
          var newBalance = JSON.parse(JSON.parse(data).query.results.postresult.p).user.balance;
          if (state === 'single_bet'){
            var win = JSON.parse(JSON.parse(data).query.results.postresult.p).bet.win;
            callback(newBalance, win);
          }
          else if (state === 'auto_bet'){
            if (JSON.parse(JSON.parse(data).query.results.postresult.p).bet){
              amount = JSON.parse(JSON.parse(data).query.results.postresult.p).bet.amount;
              var profit = JSON.parse(JSON.parse(data).query.results.postresult.p).bet.profit;
              lastBets.unshift({amount: amount, profit: profit});  
              lastBets.pop();
              callback(amount, profit, newBalance, 'go');
            }
            else {
              currentRolls--;
            }
          }
        }
      }
    },
    function(error) {
      // Failure!
      errorMessage.text('Network issue. Try again.');
      errorWindow.show();
      console.log('Failed fetching data: ' + error);
    }
  );
}

function getLastBets(state, callback){
  if (state === undefined){
    state === 'normal';
  }
   ajax(
    {
      url: "https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20html%20where%0Aurl%3D'https%3A%2F%2Fapi.primedice.com%2Fapi%2Fmybets%3Faccess_token%3D"+accessToken+"'%20%0Aand%20xpath%3D%22%2F%2Fp%22&format=json&callback=",
      method: 'get'
    },
    function(data) {
      // Success!
      for (var x=0; x<4; x++){
        lastBets.push({amount: JSON.parse(JSON.parse(data).query.results.p).mybets[x].amount, profit:JSON.parse(JSON.parse(data).query.results.p).mybets[x].profit});
      }
      if (state === 'null'){
        callback(lastBets[0].amount, lastBets[0].profit, (Number(autoBetWalletText.text().split(' ')[1]) * 100000000) + Number(lastBets[0].profit), 'go');
      }
      else {
        numRollsValue.text('Rolls left: ' + (maxRolls === 0 ? 'Unlimited' : (maxRolls - currentRolls))); 
        betValue1.text('  ' + (lastBets[0].amount/100000000).toFixed(8));
        rollValue1.text((lastBets[0].profit/100000000).toFixed(8));
        betValue2.text('  ' + (lastBets[1].amount/100000000).toFixed(8));
        rollValue2.text((lastBets[1].profit/100000000).toFixed(8));
        betValue3.text('  ' + (lastBets[2].amount/100000000).toFixed(8));
        rollValue3.text((lastBets[2].profit/100000000).toFixed(8));
        betValue4.text('  ' + (lastBets[3].amount/100000000).toFixed(8));
        rollValue4.text((lastBets[3].profit/100000000).toFixed(8));
        getUserInfo('updateBotWallet');
      }
    },
    function(error) {
      // Failure!
      errorMessage.text('Network issue. Try again.');
      errorWindow.show();
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
    },{
      title: 'Auto Bet',
      icon: 'images/bot.png',
      subtitle: 'Turn on the bot'
    },
    {
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
  if(e.itemIndex === 0){
    loadingWindow.show();
    getUserInfo('updateBetWallet');
  }
  else if (e.itemIndex === 1){
    loadingWindow.show();
    getLastBets();
  }
  else if(e.itemIndex === 2){
    loadingWindow.show();
    getUserInfo("showInfo");
  }
  else if(e.itemIndex === 3){
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

//Window shown when queries return unexpected response
var errorWindow = new UI.Window();
var errorMessage = new UI.Text({
  position: new Vector2(0,10),
  size: new Vector2(144,50),
  font: 'gothic-24-bold',
  text: 'Error',
  textAlign: 'center'
});
errorWindow.on('click','select',function(e){
  errorWindow.hide();
});
errorWindow.on('click','up',function(e){
  errorWindow.hide();
});
errorWindow.on('click','down',function(e){
  errorWindow.hide();
});
errorWindow.add(errorMessage);

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

//Window shown while waiting for response from server
var loadingWindow = new UI.Window();
var loadingText = new UI.Text({
  position: new Vector2(0,50),
  size: new Vector2(144,30),
  font: 'gothic-24-bold',
  text: 'Loading...',
  textAlign: 'center'
});
loadingWindow.add(loadingText);

//Auto bet window
var autoBetWindow = new UI.Window();
var numRollsValue, autoBetWalletText,
    betValue1, rollValue1, betValue2, rollValue2,
    betValue3, rollValue3, betValue4, rollValue4;
function initAutoBet(){
  var currentBet = baseBet;
  
  //Helper function that stops bot
  function stopBot(){
    currentRolls = 0;
    botState = 'stopped';
    autoBetText.text('Start');
    numRollsValue.text('Rolls left: ' + (maxRolls === 0 ? 'Unlimited' : (maxRolls - currentRolls)));
    currentBet = baseBet;
  }
  
  var autoBetBackground = new UI.Rect({ 
    size: new Vector2(144, 168) 
  });
  autoBetWalletText = new UI.Text({
    position: new Vector2(0,2),
    size: new Vector2(144,24),
    font: 'gothic-18',
    text: 'Wallet: ' + userStats[1].subtitle + ' BTC',
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'black'
  });
  var autoBetText = new UI.Text({
    position: new Vector2(40,30),
    size: new Vector2(70, 30),
    font: 'gothic-24-bold',
    text: 'Start',
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'black',
  });
  var buttonOutline = new UI.Rect({
    position: new Vector2(40,35),
    size: new Vector2(70, 27),
    borderColor: 'black'
  });
  numRollsValue = new UI.Text({
    position: new Vector2(-1,61),
    size: new Vector2(146,27),
    font: 'gothic-18',
    text: 'Rolls left: ' + (maxRolls === 0 ? 'Unlimited' : (maxRolls - currentRolls)),
    textAlign: 'center',
    color: 'black'
  });
  var header = new UI.Text({
    position: new Vector2(0,85),
    size: new Vector2(144,18),
    font: 'gothic-14-bold',
    text: '       Bet                 Profit',
    textAlign: 'left',
    color: 'white',
    backgroundColor: 'black'
  });
  betValue1 = new UI.Text({
    position: new Vector2(-1,102),
    size: new Vector2(146,17),
    font: 'gothic-14',
    text: '  ',
    textAlign: 'left',
    color: 'black',
    borderColor: 'black'
  });
  rollValue1 = new UI.Text({
    position: new Vector2(60,102),
    size: new Vector2(80,27),
    font: 'gothic-14',
    text: ' ',
    textAlign: 'right',
    color: 'black',
  });
  betValue2 = new UI.Text({
    position: new Vector2(-1,119),
    size: new Vector2(146,17),
    font: 'gothic-14',
    text: '  ',
    textAlign: 'left',
    color: 'black'
  });
  rollValue2 = new UI.Text({
    position: new Vector2(60,119),
    size: new Vector2(80,27),
    font: 'gothic-14',
    text: ' ',
    textAlign: 'right',
    color: 'black',
  });
  betValue3 = new UI.Text({
    position: new Vector2(-1,136),
    size: new Vector2(146,17),
    font: 'gothic-14',
    text: '  ',
    textAlign: 'left',
    color: 'black',
    borderColor: 'black'
  });
  rollValue3 = new UI.Text({
    position: new Vector2(60,136),
    size: new Vector2(80,27),
    font: 'gothic-14',
    text: ' ',
    textAlign: 'right',
    color: 'black',
  });
  betValue4 = new UI.Text({
    position: new Vector2(-1,153),
    size: new Vector2(146,17),
    font: 'gothic-14',
    text: '  ',
    textAlign: 'left',
    color: 'black',
  });
  rollValue4 = new UI.Text({
    position: new Vector2(60,153),
    size: new Vector2(80,27),
    font: 'gothic-14',
    text: ' ',
    textAlign: 'right',
    color: 'black',
  });
  var update = function (amount, profit, newBalance, state) {
    if (state === "stop"){
      stopBot();
      Vibe.vibrate('long');
    }
    else {
      if (profit > 0){
        if (onWinReturn){
         currentBet = baseBet; 
        }
        else {
        currentBet = currentBet * (1 + onWinIncreaseBy/100);
        }
      }
      else if (profit < 0){
        if (onLossReturn){
          currentBet = baseBet;
        }    
        else {
          currentBet = currentBet * (1 + onLossIncreaseBy/100);
        }
      }
      numRollsValue.text('Rolls left: ' + (maxRolls === 0 ? 'Unlimited' : (maxRolls - currentRolls)));
      autoBetWalletText.backgroundColor('white');
      autoBetWalletText.color('black');
      updateWallets(newBalance);
      setTimeout(function(){
        autoBetWalletText.backgroundColor('black');
        autoBetWalletText.color('white');
      },300);
      betValue1.text('  ' + (lastBets[0].amount/100000000).toFixed(8));
      rollValue1.text((lastBets[0].profit/100000000).toFixed(8));
      betValue2.text('  ' + (lastBets[1].amount/100000000).toFixed(8));
      rollValue2.text((lastBets[1].profit/100000000).toFixed(8));
      betValue3.text('  ' + (lastBets[2].amount/100000000).toFixed(8));
      rollValue3.text((lastBets[2].profit/100000000).toFixed(8));
      betValue4.text('  ' + (lastBets[3].amount/100000000).toFixed(8));
      rollValue4.text((lastBets[3].profit/100000000).toFixed(8));
    
      setTimeout(function(){
         if ((currentRolls < maxRolls || maxRolls === 0 || maxRolls === '0') && botState === 'running'){
            currentRolls++;
            placeBet(currentBet, botTargetValue, 'auto_bet', update);
          }
          else {
            stopBot();
            Vibe.vibrate('long');
          }
      }, 2500);
    }
  };
  
  autoBetWindow.add(autoBetBackground);
  autoBetWindow.add(autoBetWalletText);
  autoBetWindow.add(buttonOutline);
  autoBetWindow.add(autoBetText);
  autoBetWindow.add(numRollsValue);
  autoBetWindow.add(header);
  autoBetWindow.add(betValue1);
  autoBetWindow.add(rollValue1);
  autoBetWindow.add(betValue2);
  autoBetWindow.add(rollValue2);
  autoBetWindow.add(betValue3);
  autoBetWindow.add(rollValue3);
  autoBetWindow.add(betValue4);
  autoBetWindow.add(rollValue4);
  
  autoBetWindow.on('click', 'select', function(e){
    var click = autoBetText.position();
      click.y += 2;
      autoBetText.animate('position', click, 100).queue(function(next){
        click.y-=2;
        this.animate('position', click, 100);
        next();
      });
      if (botState === 'stopped'){
        botState = 'running';
        autoBetText.text('Running');
        if (currentRolls < maxRolls || maxRolls === 0){
          currentRolls++;
          placeBet(currentBet, botTargetValue, 'auto_bet', update);
        }
        else {
          stopBot();
        }
      }
    else{
      stopBot();
    }
  });
  autoBetWindow.on('click', 'back',function(e){
    stopBot();
    autoBetWindow.hide();
  });
}

//Set up settings menu
var settingsMenu = new UI.Menu({
  sections: [{
    title: 'Settings',
    items: [{
      title: 'Bot settings',
      subtitle: 'Set bot parameters'
    },
    {
      title: 'Base bet',
      subtitle: 'Set your base bet'
    }]
  }]
});
settingsMenu.on('select', function(e){
  if (e.itemIndex === 0){
    botSettingsWindow.show();
  }
  else if (e.itemIndex === 1){
    loadingWindow.show();
    getUserInfo('updateBaseBetWallet');
  }
});

//Set up bot settings window
var botSettingsWindow = new UI.Window();
function initBotSettings(){
  var botSettingsBackground = new UI.Rect({ 
    size: new Vector2(144, 168) 
  });
  var numRollsText = new UI.Text({
    position: new Vector2(5,3),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Number of rolls: ',
    textAlign: 'left',
    color: 'black'
  });
  var numRollsValue = new UI.Text({
    position: new Vector2(88,3),
    size: new Vector2(54,17),
    font: 'gothic-14',
    text: maxRolls === 0 ? 'Unlimited' : maxRolls,
    textAlign: 'center',
    color: 'black',
    borderColor: 'black'
  });
  var chanceText = new UI.Text({
    position: new Vector2(5,25),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Chance: ',
    textAlign: 'left',
    color: 'black',
  });
  var chanceValue = new UI.Text({
  position: new Vector2(88,26),
    size: new Vector2(54,17),
    font: 'gothic-14',
    text: botTargetValue + '%',
    textAlign: 'center',
    color: 'black'
  });
  var onLossText = new UI.Text({
    position: new Vector2(5,46),
    size: new Vector2(144,30),
    font: 'gothic-14-bold',
    text: 'On loss: ',
    textAlign: 'left',
    color: 'black'
  });
  var lossReturnText = new UI.Text({
    position: new Vector2(5,63),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Return to base: ',
    textAlign: 'left',
    color: 'black'
  });
  var lossReturnValue = new UI.Text({
    position: new Vector2(90,63),
    size: new Vector2(50,17),
    font: 'gothic-14',
    text: onLossReturn ? 'True' : 'False',
    textAlign: 'center',
    color: 'black',
  });
  var lossIncreaseText = new UI.Text({
    position: new Vector2(5,83),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Increase bet by: ',
    textAlign: 'left',
    color: 'black'
  });
  var lossIncreaseValue = new UI.Text({
    position: new Vector2(90,83),
    size: new Vector2(50,17),
    font: 'gothic-14',
    text: onLossIncreaseBy + "%",
    textAlign: 'center',
    color: 'black',
  });
   var onWinText = new UI.Text({
    position: new Vector2(5,108),
    size: new Vector2(144,35),
    font: 'gothic-14-bold',
    text: 'On win: ',
    textAlign: 'left',
    color: 'black'
  });
  var winReturnText = new UI.Text({
    position: new Vector2(5,125),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Return to base: ',
    textAlign: 'left',
    color: 'black'
  });
   var winReturnValue = new UI.Text({
    position: new Vector2(90,125),
    size: new Vector2(50,17),
    font: 'gothic-14',
    text: onWinReturn ? 'True' : 'False',
    textAlign: 'center',
    color: 'black',
  });
  var winIncreaseText = new UI.Text({
    position: new Vector2(5,145),
    size: new Vector2(144,30),
    font: 'gothic-14',
    text: 'Increase bet by: ',
    textAlign: 'left',
    color: 'black'
  });
  var winIncreaseValue = new UI.Text({
    position: new Vector2(90,145),
    size: new Vector2(50,17),
    font: 'gothic-14',
    text: onWinIncreaseBy + "%",
    textAlign: 'center',
    color: 'black',
  });
  botSettingsWindow.fullscreen(true);
  botSettingsWindow.add(botSettingsBackground);
  botSettingsWindow.add(numRollsText);
  botSettingsWindow.add(numRollsValue);
  botSettingsWindow.add(chanceText);
  botSettingsWindow.add(chanceValue);
  botSettingsWindow.add(onLossText);
  botSettingsWindow.add(lossReturnText);
  botSettingsWindow.add(lossReturnValue);
  botSettingsWindow.add(lossIncreaseText);
  botSettingsWindow.add(lossIncreaseValue);
  botSettingsWindow.add(onWinText);
  botSettingsWindow.add(winReturnText);
  botSettingsWindow.add(winReturnValue);
  botSettingsWindow.add(winIncreaseText);
  botSettingsWindow.add(winIncreaseValue);
  
  botSettingsWindow.on('click','up', function(e){
    if (botSelected === 'rolls'){
      maxRolls = Number(maxRolls) + 10;
      numRollsValue.text(maxRolls);
      localStorage.setItem('maxRolls', maxRolls);
    }
    else if (botSelected === 'chance'){
      if (botTargetValue + 1 <= 98){
        botTargetValue = Number(botTargetValue) + 1; 
        chanceValue.text(botTargetValue + "%");
        localStorage.setItem('botTargetValue', botTargetValue);
      }
    }
    else if(botSelected === 'loss_increase_by'){
      if (onLossReturn === true){
        onLossReturn = false;
        lossReturnValue.text('False');
        localStorage.setItem('onLossReturn', onLossReturn);
      }
      onLossIncreaseBy = Number(onLossIncreaseBy) + 5;
      lossIncreaseValue.text(onLossIncreaseBy + "%");
      localStorage.setItem('onLossIncreaseBy', 0);
    }
    else if (botSelected === 'win_increase_by'){
      if (onWinReturn === true){
        onWinReturn = false;
        winReturnValue.text('False');
        localStorage.setItem('onWinReturn', onWinReturn);
      }
      onWinIncreaseBy = Number(onWinIncreaseBy) + 5;
      winIncreaseValue.text(onWinIncreaseBy + "%");
      localStorage.setItem('onWinIncreaseBy', onWinIncreaseBy);
    }
    else {
      botOldIndex = botIndex;
      botIndex--;
      if (botIndex < 1){
        botIndex = 6;
      }
      if (botOldIndex == 1){
        numRollsValue.text(maxRolls === 0 ? 'Unlimited' : maxRolls);
        numRollsValue.color('black');
        numRollsValue.borderColor('clear');
        winIncreaseValue.color('black');
        winIncreaseValue.borderColor('black');
      }
      else if (botOldIndex == 2){
        chanceValue.color('black');
        chanceValue.borderColor('clear');
        numRollsValue.color('black');
        numRollsValue.borderColor('black');
      }
      else if (botOldIndex == 3){
        lossReturnValue.text(onLossReturn ? 'True' : 'False');
        lossReturnValue.color('black');
        lossReturnValue.borderColor('clear');
        chanceValue.color('black');
        chanceValue.borderColor('black');
      }
      else if (botOldIndex == 4){
        lossIncreaseValue.color('black');
        lossIncreaseValue.borderColor('clear');
        lossIncreaseValue.text(onLossIncreaseBy + "%");
        lossReturnValue.color('black');
        lossReturnValue.borderColor('black');
      }
      else if (botOldIndex == 5){
        winReturnValue.text(onWinReturn ? 'True' : 'False');
        winReturnValue.color('black');
        winReturnValue.borderColor('clear');
        lossIncreaseValue.color('black');
        lossIncreaseValue.borderColor('black');
      }
      else if (botOldIndex == 6){
        winIncreaseValue.color('black');
        winIncreaseValue.borderColor('clear');
        winIncreaseValue.text(onWinIncreaseBy + "%");
        winReturnValue.color('black');
        winReturnValue.borderColor('black');
      }
    }
  });
  
  botSettingsWindow.on('longClick','up', function(e){
    if (botSelected === 'rolls'){
      maxRolls = Number(maxRolls) + 100;
      numRollsValue.text(maxRolls);
      localStorage.setItem('maxRolls', maxRolls);
    }
    else if (botSelected === 'chance'){
      if (botTargetValue + 5 <= 98){
        botTargetValue = Number(botTargetValue) + 5;
        chanceValue.text(botTargetValue + "%");
        localStorage.setItem('botTargetValue', botTargetValue);
      }
    }
    else if (botSelected === 'loss_increase_by'){
      if (onLossReturn === true){
        onLossReturn = false;
        lossReturnValue.text('False');
        localStorage.setItem('onLossReturn', onLossReturn);
      }
      onLossIncreaseBy = Number(onLossIncreaseBy) + 20;
      lossIncreaseValue.text(onLossIncreaseBy + '%');
      localStorage.setItem('onLossIncreaseBy', onLossIncreaseBy);
    }
    else if (botSelected === 'win_increase_by'){
      if (onWinReturn === true){
        onWinReturn = false;
        winReturnValue.text('False');
        localStorage.setItem('onWinReturn', onWinReturn);
      }
      onWinIncreaseBy = Number(onWinIncreaseBy) + 20;
      winIncreaseValue.text(onWinIncreaseBy + '%');
      localStorage.setItem('onWinIncreaseBy', onWinIncreaseBy);
    }
  });
  
  botSettingsWindow.on('longClick','down', function(e){
    if (botSelected === 'rolls'){
      if (Number(maxRolls) - 100 >= 0){
        maxRolls = Number(maxRolls) - 100;
        numRollsValue.text(maxRolls === 0 ? 'Unlimited' : maxRolls);
        localStorage.setItem('maxRolls', maxRolls);
      }
    }
    else if (botSelected === 'chance'){
      if (Number(botTargetValue) - 5 >= 1){
        botTargetValue = Number(botTargetValue) - 5;
        chanceValue.text(botTargetValue + "%");
        localStorage.setItem('botTargetValue', botTargetValue);
      }
    }
    else if(botSelected === 'loss_increase_by'){
      if (Number(onLossIncreaseBy) - 20 >= 0){
        if (onLossReturn === true){
          onLossReturn = false;
          lossReturnValue.text('False');
          localStorage.setItem('onLossReturn', onLossReturn);
        }
        onLossIncreaseBy = Number(onLossIncreaseBy) - 20;
        lossIncreaseValue.text(onLossIncreaseBy +'%');
        localStorage.setItem('onLossIncreaseBy', onLossIncreaseBy);
      }
    }
    else if (botSelected === 'win_increase_by'){
       if (Number(onWinIncreaseBy) - 20 >= 0){
         if (onWinReturn === true){
          onWinReturn = false;
          winReturnValue.text('False');
           localStorage.setItem('onWinReturn', onWinReturn);
        }
        onWinIncreaseBy = Number(onWinIncreaseBy) - 20;
        winIncreaseValue.text(onWinIncreaseBy +'%');
        localStorage.setItem('onWinIncreaseBy', onWinIncreaseBy);
      }
    }
  });
  
  botSettingsWindow.on('click','down', function(e){
    if (botSelected === 'rolls'){
      if (Number(maxRolls) - 10 >= 0){
        maxRolls =  Number(maxRolls) - 10;
        numRollsValue.text(maxRolls === 0 ? 'Unlimited' : maxRolls);
        localStorage.setItem('maxRolls', maxRolls);
      }
    }
    else if (botSelected === 'chance'){
       if (botTargetValue - 1 >= 1){
        botTargetValue--;
        chanceValue.text(botTargetValue + "%");
        localStorage.setItem('botTargetValue', botTargetValue);
      }
    }
    else if(botSelected === 'loss_increase_by'){
      if (Number(onLossIncreaseBy) - 5 >= 0){
        if (onLossReturn === true){
          onLossReturn = false;
          lossReturnValue.text('False');
          localStorage.setItem('onLossReturn', onLossReturn);
        }
        onLossIncreaseBy = Number(onLossIncreaseBy) - 5;
        lossIncreaseValue.text(onLossIncreaseBy +'%');
        localStorage.setItem('onLossIncreaseBy', onLossIncreaseBy);
      }
    }
    else if (botSelected === 'win_increase_by'){
       if (Number(onWinIncreaseBy) - 5 >= 0){
         if (onWinReturn === true){
          onWinReturn = false;
          winReturnValue.text('False');
          localStorage.setItem('onWinReturn', onWinReturn);
        }
        onWinIncreaseBy = Number(onWinIncreaseBy) - 5;
        winIncreaseValue.text(onWinIncreaseBy + '%');
        localStorage.setItem('onWinIncreaseBy', onWinIncreaseBy);
      }
    }
    else {
      botOldIndex = botIndex;
      botIndex++;
      if (botIndex > 6){
        botIndex = 1;
      }
      if (botOldIndex == 1){
        numRollsValue.text(maxRolls === 0 ? 'Unlimited' : maxRolls);
        numRollsValue.color('black');
        numRollsValue.borderColor('clear');
        chanceValue.color('black');
        chanceValue.borderColor('black');
      }
      else if (botOldIndex == 2){
        chanceValue.color('black');
        chanceValue.borderColor('clear');
        lossReturnValue.color('black');
        lossReturnValue.borderColor('black');
      }
      else if (botOldIndex == 3){
        lossReturnValue.text(onLossReturn ? 'True' : 'False');
        lossReturnValue.color('black');
        lossReturnValue.borderColor('clear');
        lossIncreaseValue.color('black');
        lossIncreaseValue.borderColor('black');
      }
      else if (botOldIndex == 4){
        lossIncreaseValue.color('black');
        lossIncreaseValue.borderColor('clear');
        lossIncreaseValue.text(onLossIncreaseBy + "%");
        winReturnValue.color('black');
        winReturnValue.borderColor('black');
      }
      else if (botOldIndex == 5){
        winReturnValue.text(onWinReturn ? 'True' : 'False');
        winReturnValue.color('black');
        winReturnValue.borderColor('clear');
        winIncreaseValue.color('black');
        winIncreaseValue.borderColor('black');
      }
      else if (botOldIndex == 6){
        winIncreaseValue.color('black');
        winIncreaseValue.borderColor('clear');
        winIncreaseValue.text(onWinIncreaseBy + "%");
        numRollsValue.color('black');
        numRollsValue.borderColor('black');
      }
    }
  });
  botSettingsWindow.on('click', 'select', function(e){
    if (botIndex == 1 && botSelected != "rolls"){
      botSelected = "rolls";
      numRollsValue.color('white');
      numRollsValue.backgroundColor('black');
    }
    else if (botIndex == 2 && botSelected != "chance"){
      botSelected = 'chance';
      chanceValue.color('white');
      chanceValue.backgroundColor('black');
    }
    else if (botIndex == 3 && botSelected != "loss_return"){
      if (onLossReturn === false) {
        onLossReturn = true;
        lossReturnValue.text('True');
        localStorage.setItem('onLossReturn', onLossReturn);
        if (onLossIncreaseBy !== 0){
          onLossIncreaseBy = 0;
          lossIncreaseValue.text(onLossIncreaseBy + "%");
          localStorage.setItem('onLossIncreaseBy', onLossIncreaseBy);
        }
      }
      else {
        onLossReturn = false;
        lossReturnValue.text('False');
      }
      localStorage.setItem('onLossReturn', onLossReturn);
    }
    else if (botIndex == 4 && botSelected != "loss_increase_by"){
      botSelected = "loss_increase_by";
      lossIncreaseValue.color('white');
      lossIncreaseValue.backgroundColor('black');
    }
    else if (botIndex == 5 && botSelected != "win_return"){
      if (onWinReturn === false) {
        onWinReturn = true;
        winReturnValue.text('True');
        if (onWinIncreaseBy !== 0){
          onWinIncreaseBy = 0;
         winIncreaseValue.text(onWinIncreaseBy + "%");
         localStorage.setItem('onWinIncreaseBy', onWinIncreaseBy);
        }
      }
      else {
        onWinReturn = false;
        winReturnValue.text('False');
      }
      localStorage.setItem('onWinReturn', onWinReturn);
    }
    else if (botIndex == 6 && botSelected != "win_increase_by"){
      botSelected = "win_increase_by";
      winIncreaseValue.color('white');
      winIncreaseValue.backgroundColor('black');
    }
    else{
      botSelected = "none";
      if (botIndex == 1){
        numRollsValue.color('black');
        numRollsValue.backgroundColor('white');
        numRollsValue.borderColor('black');
      }
      else if (botIndex == 2){
        chanceValue.color('black');
        chanceValue.backgroundColor('white');
        chanceValue.borderColor('black');
      }
      else if (botIndex == 3){
        lossReturnValue.color('black');
        lossReturnValue.backgroundColor('white');
        lossReturnValue.borderColor('black');
      }
      else if (botIndex == 4){
        lossIncreaseValue.color('black');
        lossIncreaseValue.backgroundColor('white');
        lossIncreaseValue.borderColor('black');
      }
      else if (botIndex == 5){
        winReturnValue.color('black');
        winReturnValue.backgroundColor('white');
        winReturnValue.borderColor('black');
      }
      else if (botIndex == 6){
        winIncreaseValue.color('black');
        winIncreaseValue.backgroundColor('white');
        winIncreaseValue.borderColor('black');
      }
    }
  }); 
}

//Set up base bet window 
var setBaseBetWindow = new UI.Window();
var baseBetWalletText;
function initBaseBetSettings(){
  var baseBetInstructions = new UI.Text({
    position: new Vector2(0,27),
    size: new Vector2(144,80),
    font: 'gothic-14',
    text: 'Middle click and hold on the amount field in the bet window to set this value. Click up to increase, down to decrease.',
    textAlign: 'center',
    color: 'black'
  });
  baseBetWalletText = new UI.Text({
    position: new Vector2(0,2),
    size: new Vector2(144,24),
    font: 'gothic-18',
    text: 'Wallet: ' + userStats[1].subtitle + ' BTC',
    textAlign: 'center',
    color: 'white',
    backgroundColor: 'black'
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
  var baseBetWindowBackground = new UI.Rect({ 
    size: new Vector2(144, 168) 
  });
  setBaseBetWindow.add(baseBetWindowBackground);
  setBaseBetWindow.add(baseBetInstructions);
  setBaseBetWindow.add(baseBetWalletText);
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
}

//Set up bet window
var betWindow = new UI.Window();
var walletText;
function initBetWindow(){
  //Variables for positioning text
  var atx = 10;
  var avx = 64;
  var ctx = 10;
  var cvx = 100;
  var ptx = 10;
  var pvx = 80;
  var aty = 33;
  var avy = 33;
  var cty = 58;
  var cvy = 58;
  var pty = 83;
  var pvy = 83;
  var btx = 40;
  var bty = 113;
  var wtx = 0;
  var wty = 2;
  walletText = new UI.Text({
    position: new Vector2(wtx,wty),
    size: new Vector2(144,24),
    font: 'gothic-18',
    text: 'Wallet: ' + Number(userStats[1].subtitle.split(" ")[0]).toFixed(8) +' BTC',
    textAlign: 'center',
    color: 'white',
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
      amountValue.text(betValue);
    }
    else if (selected == "chance"){
      if (targetValue + 1 <= 98) {
        targetValue ++;
      }
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
        amountValue.color('black');
        amountValue.borderColor('clear');
        betText.color('white');
        betText.backgroundColor('black');
      }
      else if (oldIndex == 2){
        chanceValue.color('black');
        chanceValue.borderColor('clear');
        amountValue.color('black');
        amountValue.borderColor('black');
      }
      else if (oldIndex == 3){
        betText.color('black');
        betText.backgroundColor('white');
        betText.borderColor('black');
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
    }
    else if (selected == "chance"){
      if (targetValue - 1 >= 1) {
        targetValue --;
      }
      chanceValue.text(targetValue + "%");
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
        amountValue.color('black');
        amountValue.borderColor('clear');
        chanceValue.color('black');
        chanceValue.borderColor('black');
      }
      else if (oldIndex == 2){
        chanceValue.color('black');
        chanceValue.borderColor('clear');
        betText.color('white');
        betText.backgroundColor('black');
      }
      else if (oldIndex == 3){
        betText.color('black');
        betText.backgroundColor('white');
        betText.borderColor('black');
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
      amountValue.text(betValue);
    }
    else if (selected == "chance"){
      if (targetValue + 5 <= 98) {
        targetValue += 5;
      }
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
    }
    else if (selected == "chance"){
      if (targetValue - 5 >= 1) {
        targetValue -=5;
      }
      chanceValue.text(targetValue + "%");
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
      placeBet(betValue, targetValue, 'single_bet', updateWallet);
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
    walletText.backgroundColor('white');
    walletText.color('black');
    updateWallets(value);
    setTimeout(function(){
      walletText.backgroundColor('black');
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