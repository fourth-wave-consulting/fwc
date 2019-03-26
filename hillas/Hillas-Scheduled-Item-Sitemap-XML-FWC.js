/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       Mar 14th, 2019    Fourth Wave Consulting
 *
 *  Name of Script	Hillas-Scheduled-Item-Sitemap-XML-FWC.js
 *
 * Date			03/14/19
 *
 * Version		1.0
 *
 * Type			Scheduled script - runs daily
 *
 *
 *
 * Description:	This scheduled script will run once per day, and generates a master xml sitemap, along with XML site map(s) for all items for sale on the web site,
 *  in the file cabinet in the live hosting files folder. It includes all active items, up to 5mb. When the file size max is reached,
 *  it writes out the contents to a file named item-(number)-sitemap.XML. The index file references each of the item sitemaps.
 *  It also automatically assigns a priority (0 to 1) based on the following rules:

 *		all items: .2 priority
 *
 *
 * NetSuite Ver.	2017.2 or later
 *
 * Script record:
 * Deployment:
 * Primary function: buildSitemap(type)
 *
 *
 * License 		THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 *			EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
 *			MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *			THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 *			SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 *			OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 *			HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
 *			TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 *			SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
// global vars
var textBlob ='';
var fileCount = 1; // this will increment when the sitemap file reaches 5mb
var textBlobHead = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n';
var textBlobFoot = '</urlset><!-- XML sitemap file automatically generated on ' + sysDate() + '.  -->';
var fileSizeMax = 9500000; // close to 10mb file size max imposed by NS
var specialCharRegex = /&|<|>/;
var maxItemID = 0;
var startingID = 7; // one before first EFD item
var endingID = 0;
var lastIDProcessed = 7;


function buildSitemap(type) {
    var fileName = 'item1-sitemap.xml';
    var context = nlapiGetContext();
    var usageRemaining = context.getRemainingUsage();

    // get the highest internal ID for the search results, to control the loop
    maxItemID = getMaxID();
    if (maxItemID < 1) {
        return;
    }

    while (parseInt(lastIDProcessed) < parseInt(maxItemID) ) { // switch to this before going live!
        //while (parseInt(lastIDProcessed) < 25 ) { // test mode
        // call function that runs cat search and builds array
        usageRemaining = context.getRemainingUsage();
        nlapiLogExecution ('AUDIT', 'usage left before calling recursive funct=> ' + usageRemaining);
        nlapiLogExecution ('AUDIT', 'Last item ID processed in this round ' + lastIDProcessed);
        // then set lastIDProcessed = the last internalID
        lastIDProcessed = buildXMLBlob(lastIDProcessed); // recursion is sexy
    }

// write remaining stuff to the last file
    if (textBlob.length > 0) {
        nlapiLogExecution ('AUDIT', 'writing final leftover xml file - blob length: ' + textBlob.length);
        fileName = 'item' + fileCount + '-sitemap.xml';
        var fileBlob =  textBlobHead + textBlob + textBlobFoot;
        var writeSuccess = writeXMLFile(fileName, fileBlob);
        if (writeSuccess == true) {
            textBlob = ''; // reset text blob to nothing
            nlapiLogExecution ('AUDIT', 'success creating file: ' + fileName);
        } else {
            nlapiLogExecution ('ERROR', 'error writing fileBlob: ' + writeSuccess);
        }
    } else fileCount--; // decrement for index file later


    // build sitemap index file
    var indexFileName = 'Sitemap.xml';
    var currentDate = sysDate(); // returns the date
    nlapiLogExecution('DEBUG', 'currentDate: ', currentDate);
    var indexBlob = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
    // get cat-sitemap.xml last modified date using a saved search
    var catLastModResults = nlapiSearchRecord(null, 'customsearch_cat_lastmod', null, null);
    if (catLastModResults == null) {
        response.write('last modified date not found for cat-sitemap.xml.. check search customsearch_cat_sitemap_last_mod');
        return;
    } else {
        // nlapiLogExecution('DEBUG', 'first row of maxid search: ', JSON.stringify(maxIDSearchResults));

        var catFirstLine = catLastModResults[0];
        var catLastModSearchCols = catFirstLine.getAllColumns();
        if (catLastModSearchCols[1].getLabel() == "last_mod" ) {
            catLastMod = catFirstLine.getValue(catLastModSearchCols[1]);
        } else catLastMod = 'error retreiving last modified date from search';

        nlapiLogExecution('DEBUG', 'cat sitemap LastMod: ', catLastMod);
    }
    indexBlob += '<sitemap><loc>https://www.hillas.com/cat-sitemap.xml</loc><lastmod>'+ catLastMod + '</lastmod></sitemap>';
    // iterate through item files
    for (var g=1; g <= fileCount; g++) {
        indexBlob += '<sitemap><loc>https://www.hillas.com/item'+ g + '-sitemap.xml</loc><lastmod>'+ currentDate + '</lastmod></sitemap>';
    }
    indexBlob += '</sitemapindex><!-- sitemap index file automatically generated on ' + sysDate() + '. -->';
    // write to file
    var writeSuccess2 = writeXMLFile(indexFileName, indexBlob);
    if (writeSuccess2 == true) {
        textBlob = ''; // reset text blob to nothing
        nlapiLogExecution ('AUDIT', 'success creating file: ' + indexFileName);
    } else {
        nlapiLogExecution ('ERROR', 'error writing index sitemap: ' + writeSuccess2);
    }

    var endUsage = nlapiGetContext().getRemainingUsage();
    nlapiLogExecution('AUDIT', 'Final usage units remaining: ' + endUsage);
    return;
}


//define function that builds XML and adds it to big text blob
function buildXMLBlob (startID) {
    startingID = startID;
    nlapiLogExecution('AUDIT', 'calling main cat search w/id > ', startingID);
    var filters = new Array();
    filters[0] = new nlobjSearchFilter('internalidnumber', null, 'greaterthan', startingID);
    var searchresults = nlapiSearchRecord('item', 'customsearch_canonical_items', filters, null);

    if (searchresults == null) {
        nlapiLogExecution('AUDIT', 'main cat search failed for IDs > ', startingID);
        // response.write('search failed to find any results. endingID:' + endingID + ' and last id processed: ' + lastIDProcessed);
        return startID + 1;
    } else {
        nlapiLogExecution('DEBUG', 'main cat search 1k results: ', searchresults.length);
        nlapiLogExecution('DEBUG', 'main cat search 1k results: ', JSON.stringify(searchresults));

        for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) { // use this before going live!
            //for ( var i = 0; searchresults != null && i < 30; i++ ) {
            // retrieve data for this item
            var itemFullUrl = '';
            var itemTitle = '';
            var itemImageUrl = '';
            var itemLastMod = null;
            var itemDescr = '';
            var itemCaption = '';
            var imageXML = '';
            var itemPriority = 0.2; // default for all items
            var searchresult = searchresults[i];
            var searchCols = searchresult.getAllColumns();
            var internalid = searchresult.getId();
            nlapiLogExecution('DEBUG', 'Begin processing: item id: ' + internalid);
            // nlapiLogExecution('DEBUG', 'searchCols: ' + JSON.stringify(searchCols)); can't do this, causes system error
            endingID = internalid;
            //itemFullUrl = searchresult.getValue('itemurl');


            if (searchCols[12].getLabel() == 'item_url'){
                itemFullUrl = searchresult.getValue(searchCols[12]);
            }else {
                nlapiLogExecution('ERROR', 'ERROR: itemFullUrl wrong col: ', searchCols[12].getLabel());
                itemFullUrl = 'error, column label mismatch - col 12';
            }

            if (itemFullUrl == null || itemFullUrl.length < 1 || itemFullUrl.match(/preferred/)) { // don't add entry to xml sitemap if item is missing EFD canonical url
                nlapiLogExecution('ERROR', 'empty or invalid itemFullUrl, skipping itemID: ', internalid);
                continue;
            }
            encodedItemUrl = encodeURI(itemFullUrl); // converts special characters
            //nlapiLogExecution('DEBUG', 'item full url: ', encodedItemUrl);
            itemTitle = searchresult.getValue('pagetitle');
            itemTitle =  itemTitle.replace(/&/g, '&amp;');
            //itemCaption = searchresult.getValue('salesdescription');
            if (searchCols[3].getLabel() == 'sales_descr'){
                itemCaption = searchresult.getValue(searchCols[3]);
            }else {
                nlapiLogExecution('ERROR', 'ERROR: itemCaption column: ', searchCols[3].getLabel());
                itemCaption = 'error, column label mismatch - col 3';
            }

            itemCaption =  itemCaption.replace(/[\n\r]/g, ' '); // replace carriage return
            itemCaption =  itemCaption.replace(/<br\s*[\/]?>/gi, " "); // replace <br> html
            itemCaption =  itemCaption.replace(/&/g, '&amp;');
            itemCaption =  itemCaption.replace(/�/g, ' ');
            itemCaption =  itemCaption.replace(//g, ' ');
            itemCaption =  itemCaption.replace(/<[^>]*>/g, ' ');

            // loop through all the item images and add entries for them
            if (searchCols[2].getLabel() == 'concat_images'){
                itemImageUrls = searchresult.getValue(searchCols[2]);
            }else {
                nlapiLogExecution('ERROR', 'ERROR: item image concat: ', searchCols[2].getLabel());
                itemImageUrls = 'error, column label mismatch - col 2';
            }
            // split up the concatenated string, which is separated by ^
            var itemImageArr = itemImageUrls.split('^');
            //nlapiLogExecution('DEBUG', 'itemImageArr: ', JSON.stringify(itemImageArr));
            // loop through item image array and prepare the XML code
            for (var z=0; z < itemImageArr.length; z++) {

                if (itemImageArr[z].length > 1) {
                    var itemImageUrl = itemImageArr[z];
                    itemImageUrl =  itemImageUrl.replace(/&/g, '&amp;');
                    if (itemImageUrl.match(/http:\/\/hillas.com/i) != null ) {
                        // switch image url to www domain
                        nlapiLogExecution('DEBUG', 'image contains null subdomain: ', itemImageUrl);
                        itemImageUrl = itemImageUrl.replace(/http:\/\/hillas.com/i, 'https://www.hillas.com');
                    } else if (itemImageUrl.match(/hillas.com/i) == null) {
                        nlapiLogExecution('DEBUG', 'image contains no domain: ', itemImageUrl);
                        // add domain to image url
                        itemImageUrl = 'http://www.hillas.com' + itemImageUrl;
                    } else if (itemImageUrl.match(/http:\/\/www.hillas.com/i) != null ) {
                        // replace insecure domain with https version
                        //nlapiLogExecution('DEBUG', 'image contains http subdomain, fixing: ', itemImageUrl);
                        itemImageUrl = itemImageUrl.replace(/http:\/\/www.hillas.com/i, 'https://www.hillas.com');
                    }

                    imageXML += '<image:image><image:loc>' + itemImageUrl + '</image:loc><image:title>' + itemTitle +'</image:title><image:caption>' + itemCaption + '</image:caption></image:image>';


                } // end if image length > 1
            }




            //nlapiLogExecution('DEBUG', 'Current item ID: ' , internalid);
            if (searchCols[1].getLabel() == 'last_mod'){
                itemLastMod = searchresult.getValue(searchCols[1]);

            }else {
                nlapiLogExecution('ERROR', 'ERROR: item last mod column bs. value: ' + searchresult.getValue(searchCols[1]));
                itemLastMod = 'error, column label mismatch lastmod';
            }

            // build XML, add to big ol string
            var strXML = '<url>';
            strXML += '<loc>' + encodedItemUrl + '</loc>';
            strXML += '<lastmod>' + itemLastMod + '</lastmod><changefreq>weekly</changefreq>';
            strXML += '<priority>' + itemPriority + '</priority>';
            // write out the image
            strXML += imageXML;
            strXML += '</url>\n';
            textBlob += strXML; // add this entry to the big blob

            // check to see if the file size is getting close to 5mb, and split
            if (textBlob.length > fileSizeMax) {
                nlapiLogExecution ('AUDIT', 'textBlob is too big, splitting: ' + textBlob.length);
                fileName = 'item' + fileCount + '-sitemap.xml';
                var fileBlob =  textBlobHead + textBlob + textBlobFoot;
                var writeSuccess = writeXMLFile(fileName, fileBlob);
                if (writeSuccess == true) {
                    textBlob = ''; // reset text blob to nothing
                    fileCount++; // increment file count number
                    nlapiLogExecution ('AUDIT', 'success creating file: ' + fileName);
                } else {
                    nlapiLogExecution ('ERROR', 'error writing fileBlob: ' + writeSuccess);
                    break;
                }
            }
        } // end main loop through search results



        // nlapiLogExecution ('AUDIT', 'after 1k results iteration blob size: ' + bigTextBlob.length);
        nlapiLogExecution ('AUDIT', 'after 1k results endingID: ' + endingID);
        return endingID;
    }
}

// ------------------------------------------------------------------------------------------------

function writeXMLFile (filename, filecontents) {
    // create file in memory, then write to file cabinet
    var folderID = '1'; // internal ID for file cabinet folder. 1 = web site hosting files/live hosting files (root of site)
    var fileCreated = nlapiCreateFile(filename, 'XMLDOC', filecontents);
    fileCreated.setFolder(folderID);

    try {
        var fileId = nlapiSubmitFile(fileCreated);
        nlapiLogExecution('AUDIT', 'created file in cabinet - file ID: ' + fileId);
    }
    catch (e){
        //handling the error
        if (e instanceof nlobjError) {
            nlapiLogExecution('ERROR', 'system error', e.getCode() + '\n' + e.getDetails());
            return e.getDetails();
        }
        else {
            nlapiLogExecution('ERROR', 'unexpected error', e.toString());
            return e.toString();
        }
    }
    return true;
}
// -----------------------------------------------------------------------------------------------

function sysDate() {
    var date = new Date();
    var tdate = date.getDate();
    tdate = ('0' + tdate).slice(-2);
    var month = date.getMonth() + 1; // jan = 0
    month = ('0' + month).slice(-2);
    var year = date.getFullYear();
    return currentDate = year + '-' + month + '-' + tdate;
}

//-------------------------------------------------------------------------

function getMaxID () {
    var maxItemID = 0;

    var filters = new Array();
    filters[0] = new nlobjSearchColumn("internalid",null,"MAX").setSort(false);
    var maxIDSearchResults = nlapiSearchRecord('item', 'customsearch_canonical_items_2', null, filters);
    if (maxIDSearchResults == null) {
        nlapiLogExecution('ERROR', 'no max category id found - check cat search: https://system.na1.netsuite.com/app/common/search/search.nl?id=356&e=T&cu=T&whence=');
        return 0;
    } else {
        // nlapiLogExecution('DEBUG', 'first row of maxid search: ', JSON.stringify(maxIDSearchResults));
        var firstLine = maxIDSearchResults[0];
        // var maxIDSearchCols = firstLine.getAllColumns();
        // var searchColRow = maxIDSearchCols[0];

        var maxItemID = firstLine.getValue('internalid', null, 'MAX');

        // for ( var i = 0; maxIDSearchCols != null && i < maxIDSearchCols.length; i++ ) {
        //     // nlapiLogExecution('DEBUG', 'maxIDSearchCols[i].getName(): ', maxIDSearchCols[i].getName());
        //     if (maxIDSearchCols[i].getName() == "internalid" ) {
        //         maxItemID = parseInt(firstLine.getValue(searchColRow));
        //     }
        // }

        nlapiLogExecution('DEBUG', 'maxItemID: ', maxItemID);
        return maxItemID;
    }
    
}