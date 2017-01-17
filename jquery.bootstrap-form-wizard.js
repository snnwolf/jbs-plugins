/* =================================================
 * jquery.bootstrap-form-wizard.js v0.2
 * =================================================
 * Обработка форм. Отправляет ajax-POST запрос на form.action.
 * Ошибки полей, ошибки формы, сообщение размещает в диве .js-alert (по-умолчанию) под формой
 * Плагин писался для
 * css: http://twitter.github.com/bootstrap
 * django: git://github.com/earle/django-bootstrap
 *
 * Важно:
 * После кнопки «отправить» добавляется индикатор загрузки <i class="loading"></i>. При запросе на сервер к форме
 * добавляется класс .loading. В каждом проекте нужно описывать поведение тега в css.
 *
 * Требования к форме
 * - аттрибут action
 *
 * Формат ответа (json):
 *  bool success (обязательно)
 *  array error || string message || string info (иначе будет вызван success из параметров)
 */
!(function ($) {
    "use strict";
    var BootstrapFormWizard = function (element, options) {
        this.init('bootstrapFormWizard', element, options);
    };
    /**
     * Для отладки методом alert(obj) в IE
     * @param object
     */
    var alertObject = function (object) {
        var output = '', i;
        for (i in object) {
            if (typeof(object[i]) === 'function') {
                continue;
            }
            output += i + ': ' + object[i] + '; ';
        }
        alert(output);
    };

    BootstrapFormWizard.prototype = {
        constructor: BootstrapFormWizard,
        init: function (type, element, options) {
            var self = this;
            self.type = type;
            self.$element = $(element);
            self.options = self.getOptions(options);
            self.enabled = true;
            self.errors = {};
            self.locked = false;
            // fix для б.. IE
            if (!self.$element.attr('action')) {
                self.$element.attr('action', window.location.href);
            }

            // контейнер сообщений
            var $alertContainer = self.$element.find('.' + self.options.containerClass);
            if (!$alertContainer.length) {
                self.$element.append($('<' + self.options.containerTag + '/>', {
                    'class': self.options.containerClass
                }))
            }
            var submitBtn = $(self.$element).find('[type=submit]');
            if (self.options.showLoading && submitBtn) {
                $('<i class="loading"></i>').insertAfter(submitBtn);
            }

            // обработчики
            self.$element.submit(function () {
                if (self.locked) return false;
                if (self.options.beforeSubmit && !self.options.beforeSubmit(self.$element)) {
                    return false;
                }
                self.locked = true;
                self.$element.addClass('loading');
                var $form = self.$element,
                    data = new FormData($form[0]); // TODO прикрутить FormData для отправки файла/фоточки
                // очищаем ошибки
                self.clearErrors();
                self.closeAlert();
                self.disableSubmit();
                $.post($form.attr('action'), $form.serialize(), 'json')
                    .done(function (json) {
                        if (json.errors) {
                            self.options.hasError && self.options.hasError($form, json);
                            $.each(json.errors, function (i, v) {
                                self.addError(i, v);
                            });
                            self.showErrors();
                        } else if (json.success && json.message) {
                            self.alert({
                                'class': 'alert-success',
                                'content': json.message
                            });
                        } else if (json.success && json.info) {
                            self.alert({
                                'class': 'alert-info',
                                'content': json.info
                            });
                        }
                        if (!json.errors && json.success && self.options.success)
                            self.options.success($form, json);
                    })
                    .fail(function (response) {
                        self.options.error && self.options.error($form, response);
                    })
                    .always(function (xhr, status) {
                        self.locked = false;
                        self.$element.removeClass('loading');
                        self.disableSubmit(false);
                        self.options.complete && self.options.complete($form, xhr, status);
                    });
                return false;
            });
        },
        getOptions: function (options) {
            options = $.extend({}, $.fn[this.type].defaults, options, this.$element.data());
            return options;
        },
        addError: function (element, errors) {
            this.errors[element] = errors;
        },
        showErrorInput: function (element) {
            var $form = this.$element
                , field_name = this.options.fieldPrefix ? this.options.fieldPrefix + '-' + element : element
                , $field_row = $form.find('#div_id_' + field_name);
            if ($field_row.length == 0) {
                $field_row = $form.find('[name=' + field_name + ']').parents('.control-group');
            }
            $field_row.addClass('error');
        },
        showErrors: function (errors) {
            /*
             Поддерживается 2 формата ошибок:
             errors: {
             password: {field: "Пароль", errors: ["Обязательное поле."]}
             __all__: ["общая ошибка"]
             }, sucess: false
             и
             errors: {
             password: ["Обязательное поле."],
             __all__: ["общая ошибка"]
             }, sucess: false

             */
            var self = this, error_list = [];

            self.clearInputErrors();
            self.closeAlert();
            errors = $.extend({}, self.errors, errors || {});

            $.each(errors, function (i, v) {
                self.showErrorInput(i);
                if (i === '__all__') return;
                if (Array.isArray(v)) {
                    $.merge(error_list, v);
                } else {
                    var f = v['field'] || '',
                        e = v['errors'] || [];
                    $.merge(error_list, [[f, ': ', e.join('<br>')].join('')]);
                }
            });
            var _e = [];
            $.each(error_list, function (i, k) {
                if (k && _e.indexOf(k) < 0) {
                    _e.push(k);
                }
            });
            error_list = _e;
            // показываем ошибки с полей
            if (error_list.length == 0 && errors['__all__'] && errors['__all__'].length > 0) {
                error_list = errors['__all__'];
            }
            this.alert({
                'class': 'alert-error',
                'content': error_list.join('<br>')
            });
        },

        /**
         * Убрать подсветку с полей с ошибками и очистить сообщения под формой
         */
        clearErrors: function () {
            this.errors = [];
            this.clearInputErrors();
        },
        clearInputErrors: function () {
            var $form = this.$element;
            $form.find('.control-group.error').removeClass('error');
        },
        closeAlert: function () {
            var $form = this.$element;
            $form.find('.js-alert .alert').alert('close');
        },
        alert: function (message, title, params) {
            var self = this, directElement = this.$element.find('.' + this.options.containerClass);
            if (directElement.length === 0) {
                directElement = $('<div/>', {
                    'class': this.options.containerClass
                });
                this.$element.append(directElement);
            }
            if (typeof message == 'object') {
                params = $.extend({}, message);
                message = params['content'];
                title = params['title'];
            }
            params = $.extend({}, this.options, params);

            var div = $('<' + params.msgTag + '/>', {
                'class': 'alert'
            });
            div.addClass(params['class']);
            if (params.x) {
                div.append('<a href="#" class="close" data-dismiss="alert">' + params.x + '</a>');
            }
            if (title) {
                div.append('<h4 class="alert-heading">' + title + '</h4>');
            }
            div.append(message);
            directElement.append(div);
            div.bind('closed', function () {
                self.clearErrors()
            });
            setTimeout(function () {
                div.alert('close');
            }, 2000);
        },
        disableSubmit: function (enable) {
            var self = this;
            if (enable === undefined || enable) {
                $(self.$element).find('[type=submit]').attr({disabled: 'disabled'});
            } else {
                $(self.$element).find('[type=submit]').removeAttr('disabled');
            }
        }

    };


    /**
     * @memberOf jQuery
     * @param method
     * @return {*}
     */
    $.fn.bootstrapFormWizard = function (method, option) {
        return this.each(function () {
            var $this = $(this),
                data = $this.data('bootstrapwizard'),
                options = typeof method == 'object' && method;
            if (!data) $this.data('bootstrapwizard', (data = new BootstrapFormWizard(this, options)));
            if (typeof method === 'string') data[method](option);
        });
    };

    $.fn.bootstrapFormWizard.constructor = BootstrapFormWizard;

    $.fn.bootstrapFormWizard.defaults = {
        containerClass: 'js-alert' // контейнер для сообщений
        , containerTag: 'div'      // тег контейнера для сообщений (будет создан в случае отсутствия в коде)
        , msgTag: 'span'           // тег для сообщения может быть div (на всю ширину) или span (по ширине текста)
        , beforeSubmit: null       // выполняется перед отправкой данных на сервер. Должна возвращать true/false
        , hasError: null           // функция на случай ошибок в форме
        , success: null            // функция на случай удачного запроса. Будет вызван с параметрами ($form, jsonResponse)
        , complete: null           // функция вызывается после завершения аякс запроса. аргументы: (form, xhr, statusText)
        , error: null              // функция на случай неудачного запроса. Будет вызван с параметрами ($form, jsonResponse)
        , 'x': '×'                 // закрывашка для сообщения
        , 'class': 'alert-info'    // класс сообщения
        , 'content': '!!Alert!!'   // сообщение по-умолчанию
        , 'title': ''              // заголовок сообщения по-умолчанию
        , 'fieldPrefix': ''        // префикс к именам полей. Для FormWizard
        , 'showLoading': true      // показывать индикатор загрузки рядом с кнопкой submit
    };
})(window.jQuery);
