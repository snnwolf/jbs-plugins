# Зависит от:
# jquery

$ = jQuery
window.app ?= {}

(->
    # config
    app.config ?= {}
    app.config.debug = true

    app.log = ->
        if !app.config.debug
            return
        # msg = '[jquery.form] ' + Array.prototype.join.call(arguments, '')

        if window.console && window.console.log
            window.console.log arguments
        else if window.opera && window.opera.postError
            window.opera.postError arguments
        return

    # кнопка показать ещё
    class app.MoreLoader
        # отправляет ?page=X
        # ждет json: {'html': 'html block', 'pagination': {'next': 3}}
        page_num: 2
        constructor: (container, btn, url) ->
            @url = url
            @$container = $ container
            @$btn = $ btn
            if !@$container or !@$btn
                return

            @$btn.on 'click', (ev) =>
                ev.preventDefault()
                @load()

        load: ->
            self = @
            $.ajax
                type: 'get'
                url: self.url
                data: {page: self.page_num}
                dataType: 'json'
                success: (data) ->
                    self.$container.append data.html
                    if data.pagination.next
                        self.page_num = data.pagination.next
                    else
                        self.$btn.hide()
                    return
    return
)()
