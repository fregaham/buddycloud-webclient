{ BaseView } = require '../base'
{ PostView } = require './post'
{ EventHandler } = require '../../util'

class exports.CommentsView extends BaseView
    template: require '../../templates/channel/comments'

    initialize: ->
        super
        @views = {}
#         @model.bind 'change', @render
        @model.forEach @add_comment
        @model.bind 'add', @add_comment

    events:
        'keydown .answer textarea': 'hitEnterOnComment'
        'click .createComment': 'createComment'

    hitEnterOnComment: (ev) ->
        code = ev.keyCode or ev.which
        if code is 13 and ev.ctrlKey # CTRL + Enter
            ev?.preventDefault?()
            @createComment(ev)
            return false
        return true

    createComment: EventHandler ->
        if @isPosting
            return
        @$('.answer .postError').remove()
        text = @$('textarea')
        unless text.val() is ""
            text.attr "disabled", "disabled"
            @isPosting = true
            post =
                content: text.val()
                author:
                    name: app.users.current.get 'jid'
                in_reply_to: @model.parent.get 'id'
            node = @model.parent.collection.parent
            app.handler.data.publish node, post, (error) =>
                # Re-enable form
                @isPosting = false
                text.removeAttr "disabled"
                unless error
                    # Reset form
                    @el.find('.answer').removeClass 'write'
                    text.val ""
                    # clear localStorage
                    text.trigger 'txtinput'
                else
                    console.error "postError", error
                    @show_comment_error error

    show_comment_error: (error) =>
        p = $('<p class="postError"></p>')
        @$('.answer .controls').prepend(p)
        p.text(error.text or error.condition)

    add_comment: (comment) =>
        view = @views[comment.cid] ?= new PostView
            type:'comment'
            model:comment
            parent:this
        return if view.rendering
        view.render =>
            @ready =>
                @insert_comment_view view

#                 comment.bind 'change', =>
#                     view.el.detach()
#                     @insert_comment_view view

    insert_comment_view: (view) =>
        i = @model.indexOf(view.model)
        olderComment = @views[@model.at(i + 1)?.cid]
        if olderComment?.rendered
            if olderComment.el.parent().length > 0
                olderComment.el.after view.el
            else
                # wtf .. jquery's design is so b0rken m(
                olderComment.el = olderComment.el.add view.el
        else if olderComment
            olderComment.ready =>
                @insert_comment_view view
        else
            @el.prepend view.el

    render: (callback) ->
        super ->

            if @model
                text = @$('.answer textarea')
                text.textSaver()
                text.autoResize
                    extraSpace:0
                    animate:off

                @$('.answer').click() unless text.val() is ""

            callback?.call(this)

#     update_attributes: ->
#         @user = @parent.parent.parent.user # topicpostview.postsview.channelview

