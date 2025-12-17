<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif; background: #0a0a0a; color: #e5e5e5; max-width: 800px; margin: 0 auto; padding: 2rem; }
          header { border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 2rem; }
          h1 { color: #22c55e; margin: 0; }
          p { color: #888; }
          a { color: #22c55e; text-decoration: none; }
          .item { background: #171717; border: 1px solid #333; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px; }
          .item h3 { margin-top: 0; }
          .date { font-size: 0.8rem; color: #666; margin-bottom: 0.5rem; display: block; }
          .desc { line-height: 1.6; }
        </style>
      </head>
      <body>
        <header>
          <h1><xsl:value-of select="/rss/channel/title"/></h1>
          <p><xsl:value-of select="/rss/channel/description"/></p>
          <a href="#">Subscribe by copying the URL</a>
        </header>
        <xsl:for-each select="/rss/channel/item">
          <div class="item">
            <span class="date"><xsl:value-of select="pubDate"/></span>
            <h3><a href="{link}"><xsl:value-of select="title"/></a></h3>
            <div class="desc"><xsl:value-of select="description"/></div>
          </div>
        </xsl:for-each>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
