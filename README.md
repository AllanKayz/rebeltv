# IPTV Channel Browser

A web application that allows you to browse, filter, and watch IPTV channels from around the world. This application uses the free and open-source API from [iptv-org](https://github.com/iptv-org/iptv).

## Features

- **Browse Thousands of Channels:** Access a vast collection of publicly available IPTV channels.
- **Advanced Filtering:** Easily find channels by filtering by category, country, or language.
- **Search:** Quickly search for specific channels by name.
- **Integrated Video Player:** Watch streams directly in the app with the built-in HLS.js player.
- **Dynamic Data:** Channel lists and stream information are fetched dynamically from the IPTV-ORG API, ensuring they are always up-to-date.
- **Clean & Modern UI:** A user-friendly and responsive interface for easy navigation.

## How to Use

1.  The application will automatically load all available channels on startup.
2.  Use the filters in the sidebar to narrow down the channel list by category, country, or language.
3.  Use the search bar to find a specific channel by its name.
4.  Click on any channel card to start playing the stream in the integrated player.
5.  Click the '×' button to close the player and return to the channel grid.

## APIs Used

This application is powered by the following APIs from [iptv-org](https://github.com/iptv-org/iptv):

-   `channels.json`: A list of all available channels.
-   `streams.json`: A list of stream URLs for each channel.
-   `logos.json`: URLs for channel logos.
-   `countries.json`: A list of countries to filter by.
-   `categories.json`: A list of categories to filter by.
-   `languages.json`: A list of languages to filter by.

## Setup and Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Open the `index.html` file in your web browser.

There are no build steps required. All dependencies are loaded via CDNs.
