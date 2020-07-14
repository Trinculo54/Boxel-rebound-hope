//check local storage and update checkbox state
function updateAudioButton(){
    //if the volume key exists, update checkbox state
    var volume = window.storageManager.getVolume();
    var audioCheckbox = document.getElementById("id-audio");
    audioCheckbox.checked = (volume == 1) ? true : false;
}
function toggleVolume(){
    window.storageManager.toggleVolume();
    window.storageManager.uploadLocalStorageToChromeStorage(); //upload to chrome storage
}
function updateFullscreenButton(){
    //if the fullscreen key exists, update checkbox state
    var fullscreen = window.storageManager.getFullscreenValue();
    var fullscreenCheckbox = document.getElementById("id-fullscreen");
    fullscreenCheckbox.checked = (fullscreen == 1) ? true : false;
}
function toggleFullscreen(){
    window.storageManager.toggleFullscreenValue();
    window.storageManager.uploadLocalStorageToChromeStorage(); //upload to chrome storage
}
function updateFastModeButton(){
    //if the fastmode key exists, update checkbox state
    var fastMode = window.storageManager.getFastModeValue();
    var fastModeCheckbox = document.getElementById("id-fastmode");
    if (fastMode == 1) window.Game.speed = 1.5; // default
    else window.Game.speed = 1; // faster
    fastModeCheckbox.checked = (fastMode == 1) ? true : false;
}
function toggleFastMode(){
    window.storageManager.toggleFastModeValue();
    window.storageManager.uploadLocalStorageToChromeStorage(); //upload to chrome storage
    updateFastModeButton();
}

//get user token from local storage
function getUserToken(){
    window.storageManager.getUserToken();
}

//purchase functions
function getProductList() {
    console.log("google.payments.inapp.getSkuDetails");
    google.payments.inapp.getSkuDetails({
        'parameters': {env: "prod"},
        'success': onSkuDetails,
        'failure': onSkuDetailsFailed
    });
}
function onSkuDetails(response) {
    console.log("onSkuDetails", response);
    var products = response.response.details.inAppProducts;
    var count = products.length;
    for (var i = 0; i < count; i++) {
        var product = products[i];
        console.log('product: ', product);
        if (product.sku == "boxel_rebound_pro"){
            addProductToUI(product);
        }
    }
    getLicenses();
}
function onSkuDetailsFailed(response) {
    console.log("onSkuDetailsFailed", response);
    var reason = response.response.errorType;
    // update user with error and solution
    if (reason == 'TOKEN_MISSING_ERROR') $(".subtitle").html('Store is not available. Please log in to Google Chrome and turn on sync.');
    else if (reason == 'INVALID_RESPONSE_ERROR') $(".subtitle").html('Store is not available in your region.');
    else $(".subtitle").html('Store is not available. Error: ' + reason);
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    sendErrorToPortal(response);
}
function sendErrorToPortal(response) {
    response['userAgent'] = navigator.userAgent;
    response['vendor'] = navigator.vendor;
    var url = 'https://www.dopplercreative.com/boxel-rebound-portal/index.php';
    var data = { 'error_log': JSON.stringify(response) };
    $.ajax({
        type: "POST",
        url: url,
        data: data,
        success: function(response) { console.log(response); }
   });
}
function getLicenses() {
    console.log("google.payments.inapp.getPurchases");
    google.payments.inapp.getPurchases({
        'parameters': { env: "prod" },
        'success': onLicenseUpdate,
        'failure': onLicenseUpdateFailed
    });
}
function onLicenseUpdate(response) {
    console.log("onLicenseUpdate", response);
    var licenses = response.response.details;
    var count = licenses.length;
    for (var i = 0; i < count; i++) {
        var license = licenses[i];
        if (license.sku == "boxel_rebound_pro"){
            if (license.state == "ACTIVE") addLicenseDataToProduct(license);
            else if (license.state == "PENDING") addPendingInfo(license);
        }
    }
}
function onLicenseUpdateFailed(response) {
    console.log("onLicenseUpdateFailed", resonse);
    var reason = response.response.errorType;
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    $(".subtitle").html('Failed to update license. Error: ' + reason);
    sendErrorToPortal(response);
}
function buyProduct(sku) {
    console.log("google.payments.inapp.buy", sku);
    google.payments.inapp.buy({
        parameters: {'env': "prod"},
        'sku': sku,
        'success': onPurchase,
        'failure': onPurchaseFailed
    });
}
function onPurchase(purchase) {
    console.log("onPurchase", purchase);
    getLicenses();
}
function onPurchaseFailed(purchase) {
    console.log("onPurchaseFailed", purchase);
    var reason = purchase.response.errorType;
    if (reason == 'PURCHASE_CANCELED') $(".subtitle").html('Purchase canceled.');
    else $(".subtitle").html('Failed to purchase product. Error: ' + reason);
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    sendErrorToPortal(purchase);
}
function consumeProduct(sku) {
    console.log("google.payments.inapp.consumePurchase", sku);
    google.payments.inapp.consumePurchase({
        'parameters': {'env': 'prod'},
        'sku': sku,
        'success': onConsume,
        'failure': onConsumeFail
    });
}
function onConsume(purchase) {
    console.log("onConsume", purchase);
    getLicenses();
}
function onConsumeFail(purchase) {
    console.log("onConsumeFail", purchase);
    var reason = purchase.response.errorType;
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    $(".subtitle").html('onConsumeFail. ' + reason);
    sendErrorToPortal(purchase);
}
function addProductToUI(product) {
    var currency_symbols = { 'USD': '$', 'EUR': '€', 'CRC': '₡', 'GBP': '£', 'ILS': '₪', 'INR': '₹', 'JPY': '¥', 'KRW': '₩', 'NGN': '₦', 'PHP': '₱', 'PLN': 'zł', 'PYG': '₲', 'THB': '฿', 'UAH': '₴', 'VND': '₫' };
    var currencyCode = product.prices[0].currencyCode;
    var currencyChar = currency_symbols[currencyCode];
    var currency = (currencyChar != null) ? currencyChar : "";
    var price = Math.round((parseInt(product.prices[0].valueMicros, 10) / 1000000) * 100) / 100;
    var button = $('<a href="#" class="md-btn"></a>')
        .data('sku', product.sku)
        .attr('id', product.sku)
        .click(onActionButton)
        .append('<span class="strike">' + currency + (price + 1) + '</span> ' + currency + price);
    $(".subtitle").html('<img class="google-icon" src="img/icons/google-icon.svg" />Upgrade to <strong>PRO</strong>');
    $('.ad').append(button);
    $('.ad').append('<div class="caption" id="caption-link">+8 Player skins<br>+Unlimited uploads<br>+Unlimited downloads<br>+Cloud backups</div>');
}
function addLicenseDataToProduct(license) {
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    $(".subtitle").html('<img class="google-icon" src="img/icons/google-icon.svg" />Your account has been activated. Thank you for supporting Boxel Rebound!');
    window.storageManager.setLicense(license.sku);
}
function addPendingInfo(license) {
    console.log('addPendingInfo');
    $("#boxel_rebound_pro").remove(); //hide button for pro players
    $(".subtitle").html('Your purchase is pending and will be available soon.');
}
function onActionButton(evt) {
    var actionButton = $(evt.currentTarget);
    if (actionButton.data("license")) {
        console.log('license: ' + actionButton.data("license"));
        //TODO: Show that the user purchased the game
    } 
    else {
        var sku = actionButton.data("sku");
        buyProduct(sku);
    }
}
function checkChromeStorage(){
    window.storageManager.checkChromeStorage();
}
// get parameter from url - https://stackoverflow.com/a/21903119/2510368
function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    var sParameterName;
    for (var i = 0; i < sURLVariables.length; i++) {
        sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] === sParam) {
            return sParameterName[1] === undefined ? true : decodeURIComponent(sParameterName[1]);
        }
    }
};
function checkExtension(){
    // create a skin condition
    var showSkinDialog = window.storageManager.hasLicense() == false && window.storageManager.skinIsActive(3) == false;

    //show options overlay for chrome extension release
    if (chrome.extension.ViewType.TAB == "tab" &&
        getUrlParameter("fullscreen") != 'true' &&
        getUrlParameter("browse") != 'true') {

        // update skin text if applicable
        var updateSocialLink = Math.random() >= 0.5;
        var socialURL = 'https://chrome.google.com/webstore/detail/boxel-rebound/iginnfkhmmfhlkagcmpgofnjhanpmklb/reviews';
        if (showSkinDialog == true) {
            $('#id-social').html('<a href="#" id="id-social">Get a free <i class="material-icons">favorite</i> skin</a>');
        }
        else {
            if (updateSocialLink == true) $('#id-social').html('<a href="#" id="id-social"><i class="material-icons">favorite</i> Test Boxel 3D</a>');
        }

        document.getElementById("id-options").style.display = "block";
        //create listeners
        document.getElementById("id-audio").addEventListener("click", function(){ toggleVolume(); });
        document.getElementById("id-fullscreen").addEventListener("click", function(){ toggleFullscreen(); });
        document.getElementById("id-fastmode").addEventListener("click", function(){ toggleFastMode(); });
        document.getElementById("id-browse").addEventListener("click", function(){ 
            chrome.tabs.create({ url:'www/index.html?browse=true&filter=recent' });
        });
        document.getElementById("id-play").addEventListener("click", function(){ 
            document.getElementById("id-options").style.display = "none";
            if (document.getElementById("id-fullscreen").checked == true){
                chrome.tabs.create({ url:'www/index.html?fullscreen=true' });
            }
        });
        document.getElementById("id-social").addEventListener("click", function(){ 
            if (showSkinDialog == true) chrome.tabs.create({ url:'www/skin.html' });
            else {
                if (updateSocialLink == true) socialURL = 'https://boxel3d.com/';
                chrome.tabs.create({ url: socialURL });
            }
        });

        //display extension version number
        $.getJSON("../manifest.json", function(json) {
            $('#version').text('v'+json.version);
        });

        //update checkboxes onload
        checkChromeStorage();
        updateAudioButton();
        updateFullscreenButton();
        getUserToken();
        getProductList();
    }
    else if (window.location.href.indexOf("browse") >= 0) {
        $('#app').appendTo('#app-container');
        document.getElementById("browser").style.display = "block";

        $(document).ready(function(){
            var filter = getUrlParameter("filter");
            var url = 'https://www.dopplercreative.com/boxel-rebound-portal/index.php';
            var user_id = window.storageManager.getUserToken();
            var data = { 'filter': filter, 'size': 6, 'user_id': user_id };
            var levels = $('#levels');
            var search = $('#search-form');

            // request data from the server and render levels
            if (window.storageManager.checkDailyLimit('download')){
                $.ajax({
                    type: "POST",
                    url: url,
                    data: data,
                    success: function(response) {
                        console.log(response);
                        if (response.error == null) {
                            levels.removeClass('loading');
                            response.forEach(function(item){
                                levels.append(
                                    '<div class="level col-12" id="' + item.level_id + '">'+
                                        '<div class="level_map loading"></div>'+
                                        '<div class="stats">'+
                                            '<div class="report"><i class="material-icons">flag</i>Report</div>'+
                                            '<div class="level_id">#' + item.level_id + '</div>'+
                                            '<div class="completed"><i class="material-icons">check</i>' + item.completed + '</div>'+
                                            '<div class="downloads"><i class="material-icons">save_alt</i>' + item.downloads + '</div>'+
                                        '</div>'+
                                    '</div>'
                                );
                            });
                            $('nav a[href*="' + filter + '"]').addClass('active');
                        }
                        renderMaps(response);
                    }
                });
            }
            else {
                levels.removeClass('loading');
                levels.append('<p class="level limit">You have reached your download limit. Please try again in 24 hours or upgrade to Boxel Rebound Pro for unlimited levels.</p>')
            }
            function renderMaps(response){
                // wait for game object to be ready
                (function checkFlag() {
                    if(window.Game.ready != true) { window.setTimeout(checkFlag, 100); } else {
                        // add images and links to each level
                        response.forEach(function(item){
                            var levelMap = item.level_map;
                            if (levelMap.indexOf('<map>') < 0) levelMap = LZString.decompressFromUTF16(levelMap);
                            var imgURL = window.storageManager.exportMapToPNGImage(levelMap, item.level_id);
                            var level = $('#' + item.level_id);
                            level.find('.level_map').removeClass('loading');
                            level.find('.level_map').append('<img src="' + imgURL + '"/>');
                            level.find('.level_map').on('click', function(){
                                window.storageManager.loadLevelFromPortal(item.level_id);
                            });
                            updateLevel(item, null);
                            //level.find('.report').addClass(item.user_vote == 'flag' ? 'active' : '');
                            level.find('.report').on('click', function(){
                                if (level.find('.report').hasClass('active') == false) {
                                    updateLevel(null, $(this));
                                    window.storageManager.addVoteToLevel(item.level_id, 'flag');
                                }
                                else {
                                    updateLevel(null, $(this));
                                    window.storageManager.addVoteToLevel(item.level_id, '');
                                }
                            });
                        });

                        // add search functionality
                        search.on('submit', function(e){
                            e.preventDefault();
                            window.storageManager.loadLevelFromPortal(search.find('#search-box').val().replace('#', ''));
                            // $('#browser').animate({ scrollTop: $("#app").offset().top - 24 }, 250);
                        });
                    }
                })();
            }
            function updateLevel(prevItem, prevLevel) {
                var level, report;
                if (prevItem != null) {
                    level = $('#' + prevItem.level_id);
                    report = prevItem.user_vote == 'flag';
                }
                else if (prevLevel != null) {
                    level = prevLevel.closest('.level');
                    report = level.find('.report').hasClass('active');
                    report = !report; // toggle report state
                }
                if (report == true) {
                    level.addClass('censor');
                    level.find('.report').addClass('active');
                }
                else {
                    level.removeClass('censor');
                    level.find('.report').removeClass('active');
                }
            }
        });
    }
    updateFastModeButton();
}
checkExtension();