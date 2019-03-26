# Responsive Conversion Blog Post Items
- Check which theme is live

- Add in Meta Viewport tag under "Addition to <HEAD>": 
"
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=9; IE=8al; IE=7; IE=EDGE" />
"

- Open homepage and a few key inner pages to check the console for any existing JS errors that might be occuring that may be fixed or made worse with the changing of a jQuery version. You wont know that this step broke anything if you dont do this first.

- Add in / make sure that jQuery is running 2.2, not 1.x or 3.x 
"<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js"></script>"

- Under "Body" tab in Themes menu, add <!-- Begin --> and <!-- end --> template tags for easier referencing when using the Inspect Element. Saves time digging later.

- Remove hard-coded widths (if any) from sidebar elements. These will restrict the widths of the elements to pixel values which we dont want in this case, since we want it to be adapative in all browser sizes.

- Download local copy of relevant style override files from Web Hosting Files which are referenced in the "Addition to <HEAD>" section of the General Theme menu.

- For easier reading, go to "http://css2sass.herokuapp.com/" and paste entire stylesheet in the left column and click "convert to SCSS". You can also do this locally via gulpfile and local configuration but i've found this is just as easy and the local setup is an unnecessary step most of the time. This tool will also eliminate all duplicated style / parent element declarations and also prevent you with any syntax errors before converting. Its a pretty useful debugging tool.

- For going from your generated SCSS back to a regular CSS file, which you need to do before uploading or replacing the existing stylesheet, I use the website: "https://www.cssportal.com/scss-to-css/". Make SURE to hit clear or refresh EVERY time you convert the code, i've had a few headaches where it simply duplicated the entire stylesheet a few times opn accident, causing the stylesheet file to be astronomically large. 


- Style changes can be a bit of a pain to keep track of syntax errors, and other small edits you may have not even knew you made. To alleviate the pain of going "What the hell did i change and where?" questions... I reccommend setting up a local git environment.
  You dont necessarily need to setup and create or push to a repository but its nice to simply "commit" changes and be able to have as log of specific change as you go. You can simply revert each commit locally, since Netsuite doesn't keep a record of file changes.
  
- Before the wide adoption of the FlexBox across all major browsers, I used to immediately include / install a reference to a CSS framework to alleviate reinventing "the wheel" that is responsive styles. However now, I simply do most of my styles via Flexbox as it can convert previously non-responsive elements into responsive with just one or two simple CSS declarations.

- Do not "Edit" stylesheet, instead save local .css file and Overwrite file. If you simply edit and try to save it will notify you that the record didnt change, and the changes wont reflect on the site which could cause some confusion. If you are editing or overwr
