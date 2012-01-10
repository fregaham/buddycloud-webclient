{ Template } = require 'dynamictemplate'

class exports.BaseView extends Backbone.View
    template: -> new Template # empty.
    el: $('<div empty>') # so @el is always a jquery object

    initialize: ({@parent} = {}) ->
        @rendered = no

    render: (callback) ->
        tpl = @template(this)
        tpl.ready =>
            @rendered = yes
            @el = tpl.jquery
            @delegateEvents()
            callback?.call?(this)
            # invoke delayed callbackes from ready
            if @_waiting?
                cb?() for cb in @_waiting
                delete @_waiting

    ready: (callback) ->
        return callback?() if @rendered
        @_waiting ?= []
        @_waiting.push callback
