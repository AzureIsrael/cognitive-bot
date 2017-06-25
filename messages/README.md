Cognitive bot demo
==================

This code generated backend for cognitive bot demo based on Azure Bot Service.
It uses Microsoft Cognitive Services like:
1. [Face API](https://azure.microsoft.com/en-us/services/cognitive-services/face/) - face detection and identification
2. [Text Analytics API](https://azure.microsoft.com/en-us/services/cognitive-services/text-analytics/) - languade detection
3. [Translator Text API](https://azure.microsoft.com/en-us/services/cognitive-services/translator-text-api/) - translate text from detected language to english
4. [Computer Vision API](https://azure.microsoft.com/en-us/services/cognitive-services/computer-vision/) - image description and OCR

Architecure
-----------
![cognitive bot architecure](img/architecture.png)


Setup
-----
1. Create a resource group on azure
2. Create all four cognitive services listed above, copy their endpoints url and primary keys
3. Create bot service based on node js code
4. Clone this repo locally
5. Setup continuous integration from your git repo to the bot service
6. Test your bot with web chat