/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       Mar 14th, 2019  Fourth Wave Consulting
 *
 *  Name of Script	Scheduled-Category-XML-Sitemap-FWC.js
 *
 * Date			Updated 03.14.19
 *
 * Version		1.0
 *
 * Type			Scheduled script - runs daily
 *
 * Main function: scheduledSitemap()
 *
 * Description:	This scheduled script will run once per day, and generates a XML site map
 *  in the file cabinet in the live hosting files folder. It includes the home page and all active categories. The master
 *  sitemap index file will reference this category XML file so it's included.
 *  It also automatically assigns a priority (0 to 1) based on the following rules:
 *   	a. Home page: 1
 *		b. Top level categories (without parent): .9
 *		c. 2nd level categories: .8
 *		d.  3rd level categories: .7
 *		e.  4th level categories: .6
 *		f.  items: .2
 *
 * There is rescheduling built in to this script, if it runs out of execution units it should reschedule itself and finish.
 *
 * The Scheduled-Item-XML-Sitemap-FWC.js script references this file, and creates the master sitemap file.
 *
 * NetSuite Ver.	2017.2 or later
 *
 *	1. Main cat search:
 *	    a. ID: customsearch_web_cats_xml
 *		b. ID: 352
 *	2. Max id cat search:
 * 		a. ID: customsearch_web_cats_xml_2
 *		b. ID: 353
 *
 * Script record: https://system.na1.netsuite.com/app/common/scripting/script.nl?id=244&whence=
 * Deployment: https://system.na1.netsuite.com/app/common/scripting/scriptrecord.nl?id=238&whence=
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
 *Primary function: scheduledSitemap
 */

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
// global vars
// global variables
var textBlob = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">';
var catArr = new Array(); // used to check for dupes
var baseWebUrl = 'http://www.hillas.com/';
var baseWebUrlNoSlash = 'http://www.hillas.com';
var startingID = -101; // lots of web site categories, this is lowest ID


var endingID = 0;
var lastIDProcessed = -101;
var folderID = '1'; // internal ID for file cabinet folder.  = web site hosting files/live hosting files (root of site)

// start primary function
function scheduledSitemap(type) {
    var fileName = 'cat-sitemap.xml';

    textBlob += '<url><loc>' + baseWebUrl + '</loc><changefreq>monthly</changefreq><priority>1.0</priority><image:image><image:loc>https://www.hillas.com/core/media/media.nl?id=24&amp;c=3728588&amp;h=ea83c0d7feac068b738a</image:loc><image:caption>Hillas.com stocks a wide selection of industrial and packaging products and machinery from many distribution locations for fast delivery of Abrasives.</image:caption></image:image></url>'; // add home page manually

    var maxItemID = 0;

    var bigTextBlob = new Array();
    var bigBlobRow = 0;
    var context = nlapiGetContext();
    var usageRemaining = context.getRemainingUsage();

    // get the highest internal ID for the search results, to control the loop
    maxItemID = getMaxID();
    if (maxItemID < 1) {
        return;
    }

    // call main loop to build big JS array of data
    while (parseInt(lastIDProcessed) < parseInt(maxItemID) ) { // switch to this before going live!
        //while (parseInt(lastIDProcessed) < 5 ) { // test mode
        // call function that runs cat search and builds array
        usageRemaining = context.getRemainingUsage();
        nlapiLogExecution ('AUDIT', 'usage left before calling recursive funct=> ' + usageRemaining);
        buildXMLBlob(lastIDProcessed);
    }

    // build the text file & save it in file cabinet
    textBlob += '</urlset><!-- XML sitemap file automatically generated on ' + sysDate() + '. Built by Fourth Wave Consulting www.fourthwc.com -->';

    var fileCreated = nlapiCreateFile(fileName, 'XMLDOC', textBlob);
    fileCreated.setFolder(folderID);

    try {
        var fileId = nlapiSubmitFile(fileCreated);
        nlapiLogExecution('AUDIT', 'created file in cabinet - file ID: ' + fileId);
    }
    catch (e){
        //handling the error
        if (e instanceof nlobjError) {
            nlapiLogExecution('ERROR', 'system error', e.getCode() + '\n' + e.getDetails());
        }
        else {
            nlapiLogExecution('ERROR', 'unexpected error', e.toString());
        }
    }

    //nlapiLogExecution('AUDIT', 'catArr dupe array:', JSON.stringify(catArr));
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
    // filters[1] = new nlobjSearchFilter('isinactive', null, 'is', 'F'); invalid filter!
    var searchresults = nlapiSearchRecord('sitecategory', 'customsearch_web_cats_xml', filters, null);

    if (searchresults == null) {
        nlapiLogExecution('AUDIT', 'main cat search (customsearch_web_cats_xml) failed for IDs > ', startingID);
        // response.write('search failed to find any results. endingID:' + endingID + ' and last id processed: ' + lastIDProcessed);
        return startID + 1;
    } else {
        nlapiLogExecution('DEBUG', 'main cat search 1k results: ', JSON.stringify(searchresults));

        for ( var i = 0; searchresults != null && i < searchresults.length; i++ ) { // use this before going live!
            
            // set recovery point, and Check remaining usage
            if( (i % 10 ) == 0 ) {
                // setRecoveryPoint(); //this recovery point might be out of order, calling it only when usage limit is close
                checkGovernance();
            }
            //for ( var i = 0; searchresults != null && i < 25; i++ ) {
            // retrieve data for this cat
            var catFullUrl = '';
            var catUrlComp = '';
            var catTitle = '';
            var catImageUrl = '';
            var catLastMod = null;
            var parentID = null;
            var catPriority = .9; // this will be calcuated based on depth
            var searchresult = searchresults[i];
            var searchCols = searchresult.getAllColumns();
            var internalid = searchresult.getId();

            // Check for duplicates
            if (indexOf.call(catArr, internalid) > -1 ) {
                // script has already processed this category, skip it
                nlapiLogExecution('AUDIT', 'duplicate category found, skipping: ' + internalid);
                continue;
            } else {
                // push onto dupe checking array
                catArr.push(internalid);
            }

            nlapiLogExecution('DEBUG', 'START processing Cat internal id: ' + internalid);
            endingID = internalid;
            // update var that controls the master loop
            lastIDProcessed = internalid;

            catUrlComp = searchresult.getValue('urlcomponent');

            // check full name field for 'Advanced search' to id published saved searches
            var catFullName = searchresult.getValue('fullname');
            if (catFullName.indexOf('Advanced Search') > -1 ) {
                 nlapiLogExecution('ERROR', 'category name contains advanced search, so it is a published saved search. skipping. ID: ' + internalid);
                 continue; 
            }

            // load the category record to determine if it's part of EFD and active
            try {
                // load the category record to determine if it's part of EFD and active
                var currCatRec = nlapiLoadRecord('sitecategory', internalid);
                //nlapiLogExecution('DEBUG', 'Attempting to load category internalid ' + internalid);
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
                nlapiLogExecution('ERROR', 'loading category FAIL' , 'problably published saved search. internalid ' + internalid);
                continue;
            }
            // first check to see if the cat is active
            var catInactive = currCatRec.getFieldValue('isinactive');

            //nlapiLogExecution('DEBUG', 'inactive? ' + catInactive);
            if (catInactive === 'T') {
                nlapiLogExecution('DEBUG', 'category is inactive, skipping: ' +  internalid);
                continue; // end processing this cat, go to next
            } else nlapiLogExecution('DEBUG', 'Actual useful cat found to process - id: ' + internalid);

            var parentCat = currCatRec.getFieldValue('parentcategory');
            var parentCatName = currCatRec.getFieldText('parentcategory');
            // catLastMod = currCatRec.getFieldValue('lastmodifieddate'); this data don't exist
            //nlapiLogExecution('DEBUG', 'parentCat: ' + parentCat + ' name: ' + parentCatName);
            // nlapiLogExecution('DEBUG', 'cat record JSON: ', JSON.stringify(currCatRec));
            /* images can't be accessed
            var catThumbImg = currCatRec.getFieldValue('displaythumbnail');
            var catMainImg = currCatRec.getFieldValue('displayimage');
            nlapiLogExecution('DEBUG', 'catThumbImg: ' + catThumbImg + ' catMainImg: ' + catMainImg);
            */

            // assign cat priority - how many colons in the parent cat name?
            var colons = parentCatName.match(/:/g);
            if (colons != null) {
                var colonCount = colons.length;
                //nlapiLogExecution('DEBUG', 'colon count: ' , colonCount);
                catPriority = catPriority - (colonCount * .1);
            }


            //catFullUrl = searchresult.getValue('web_url');
            if (searchCols[8].getLabel() == 'web_url'){
                catFullUrl = searchresult.getValue(searchCols[8]);
            }else {
                nlapiLogExecution('ERROR', 'ERROR: item_url column: ', searchCols[8].getLabel());
                catFullUrl = 'error, column label mismatch - col 8';
            }


            // build XML, add to big ol string
            strXML = '<url>';
            strXML += '<loc>' + catFullUrl + '</loc>';
            strXML += '<changefreq>monthly</changefreq>';
            strXML += '<priority>' + catPriority + '</priority>';
            // strXML += '<!-- internalid: ' + internalid + ' -->';
            strXML += '</url>\n';
            textBlob += strXML; // add this entry to the big blob



        }



        // nlapiLogExecution ('AUDIT', 'after 1k results iteration blob size: ' + bigTextBlob.length);
        nlapiLogExecution ('AUDIT', 'after 1k results endingID: ' + endingID);
        return endingID;
    }
}

// ------------------------------------------------------------------------------------
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
    var maxIDSearchResults = nlapiSearchRecord('sitecategory', 'customsearch_web_cats_xml_2', null, null);
    if (maxIDSearchResults == null) {
        response.write('no max category id found - check cat search ID 353 or customsearch_web_cats_xml_2');
        return 0;
    } else {
        // nlapiLogExecution('DEBUG', 'first row of maxid search: ', JSON.stringify(maxIDSearchResults));
        var firstLine = maxIDSearchResults[0];
        var maxIDSearchCols = firstLine.getAllColumns();
        for ( var i = 0; maxIDSearchCols != null && i < maxIDSearchCols.length; i++ ) {
            // nlapiLogExecution('DEBUG', 'maxIDSearchCols[i].getName(): ', maxIDSearchCols[i].getName());
            if (maxIDSearchCols[i].getName() == "internalid" ) {
                var searchColRow = maxIDSearchCols[i];
                maxItemID = parseInt(firstLine.getValue(searchColRow));
            }
        }

        nlapiLogExecution('DEBUG', 'maxItemID: ', maxItemID);
        return maxItemID;
    }

}

// ---------------------------------------------------------------------------------------------

//from http://stackoverflow.com/questions/1181575/determine-whether-an-array-contains-a-value
var indexOf = function(needle) {
    if(typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;

            for(i = 0; i < this.length; i++) {
                if(this[i] === needle) {
                    index = i;
                    break;
                }
            }

            return index;
        };
    }

    return indexOf.call(this, needle);
};

//---------------------------------------------------------------------------------------------

function setRecoveryPoint()
{
    var state = nlapiSetRecoveryPoint(); //100 point governance
    if( state.status == 'SUCCESS' ) {
        nlapiLogExecution("ERROR", "we successfully created a new recovery point ");
        return;  //we successfully created a new recovery point
    }
    if( state.status == 'RESUME' ) //a recovery point was previously set, we are resuming due to some unforeseen error
    {
        nlapiLogExecution("ERROR", "Resuming script because of " + state.reason+".  Size = "+ state.size);
        // handleScriptRecovery();
    }
    else if ( state.status == 'FAILURE' )  //we failed to create a new recovery point
    {
        nlapiLogExecution("ERROR","Failed to create recovery point. Reason = "+state.reason + " / Size = "+ state.size);
        // handleRecoveryFailure(state);
    }
}

function checkGovernance()
{
    var context = nlapiGetContext();
    if( context.getRemainingUsage() < 450 )
    {
        nlapiLogExecution("ERROR","Attempting to yield script, low in units: " + context.getRemainingUsage());
        nlapiLogExecution("ERROR","textBlob size: " + textBlob.length);
        var state = nlapiYieldScript();
        nlapiLogExecution("ERROR","Yield script results: " + JSON.stringify(state));

        if( state.status == 'FAILURE' )
        {
            nlapiLogExecution("ERROR","Failed to yield script, exiting: Reason = "+state.reason + " / Size = "+ state.size);
            throw "Failed to yield script";
        } else if ( state.status == 'RESUME' )
        {
            nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason +".  Size = "+ state.size);
        }
        // state.status will never be SUCCESS because a success would imply a yield has occurred.  The equivalent response would be yield
    }
}

function handleRecoverFailure(failure)
{
    if( failure.reason == 'SS_MAJOR_RELEASE' ) throw "Major Update of NetSuite in progress, shutting down all processes";
    if( failure.reason == 'SS_CANCELLED' ) throw "Script Cancelled due to UI interaction";
    if( failure.reason == 'SS_EXCESSIVE_MEMORY_FOOTPRINT' ) { setRecoveryPoint(); }//avoid infinite loop
    if( failure.reason == 'SS_DISALLOWED_OBJECT_REFERENCE' ) throw "Could not set recovery point because of a reference to a non-recoverable object: "+ failure.information;
}