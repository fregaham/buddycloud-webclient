{ BaseView } = require '../base'
{ EventHandler, parse_post } = require '../../util'

class exports.PostView extends BaseView
    template: require '../../templates/channel/post'

    initialize: ({@type}) ->
        super

        @model.bind 'change:content', @change_content
        @ready @change_content

    ##
    # TODO
    #
    # Actually, posts should have embedded static links in XHTML in
    # the ATOM entries. Scanning for them when displaying is just the
    # short preliminary way for now.
    change_content: =>
        @trigger('update:content', parse_post(@model.get('content')?.value))

    events:
        'click .name': 'clickAuthor'
        'click .avatar': 'clickAuthor'
        'click .userlink': 'clickUserlink'

    clickAuthor: EventHandler ->
        app.router.navigate @model.get('author')?.jid, true

    clickUserlink: EventHandler (ev) ->
        el = ev.srcElement
        userid = el and $(el).data('userid')
        if userid
            app.router.navigate userid, true

    # TODO: make url configurable
    # TODO: filter HTML for XSS
    load_url_preview: (url, callback) ->
        embedly_url = "http://api.embed.ly/1/oembed" +
            "?url=#{encodeURIComponent url}" +
            "&format=json" +
            "&maxwidth=400"
        # Set one for debugging embedly on localhost:
        if config.embedly_key
            embedly_url += "&key=#{config.embedly_key}"
        jQuery.ajax
            url: embedly_url
            dataType: 'json'
            error: (jqXHR, textStatus, errorThrown) =>
                console.error "embed error", textStatus, errorThrown
            success: callback
