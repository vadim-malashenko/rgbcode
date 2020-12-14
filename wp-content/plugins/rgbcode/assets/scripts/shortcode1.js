(() => {

    class Template {

        static html(template, item) {
            return item instanceof Object
                ? Object.keys(item).reduce(
                    (html, key) => html = html.replace(new RegExp(`%${key}`, 'g'), item [key]),
                    template
                )
                : ''
        }
    }

    const Filter = (() => {

        const templates = /*HTML*/
            {
                select: `<select>%options</select>`,
                option: `<option value="%value">%content</option>`
            }

        let _container

        return class Filter {

            constructor(container, options, filter) {

                _container = container

                _container.insertAdjacentHTML('afterbegin', Template.html(templates.select, {
                    options: options.reduce((options, option) => options + Template.html(templates.option, {
                        value: option.value,
                        content: option.text
                    }), '')
                }))

                _container.querySelector(':scope select').addEventListener('change', filter)
            }

            value() {
                return _container.querySelector(':scope select').value
            }
        }
    })()

    const Pagination = (() => {

        const templates = /*HTML*/
            {
                nav: `<nav style="width:100%;margin-top:1rem;display:flex;justify-content: center">%content</nav>`,
                button: `<button %disabled style="width:8rem">%content</button>`,
                div: `<div style="width:2rem;border:1px solid;display:flex;justify-content: center">%content</div>`
            }

        let _container, _previous, _current, _next

        return class Pagination {

            constructor(container, current, last, previous, next) {

                _container = container

                _container.insertAdjacentHTML('beforeend', Template.html(templates.nav, {
                    content: Template.html(templates.button, {
                            content: 'Previous',
                            disabled: current === 1 ? 'disabled' : ''
                        })
                        + Template.html(templates.div, {content: current})
                        + Template.html(templates.button, {
                            content: 'Next',
                            disabled: current >= last ? 'disabled' : ''
                        })
                }))

                _previous = _container.querySelector(':scope button:first-child')
                if (_previous !== null) {
                    _previous.addEventListener('click', previous)
                }

                _next = _container.querySelector(':scope button:last-child')
                if (_next !== null) {
                    _next.addEventListener('click', next)
                }

                _current = _container.querySelector(':scope div')
            }

            update(ev) {
                const current = parseInt(ev.detail.current), last = parseInt(ev.detail.last)
                _current.innerText = current
                _previous.disabled = current <= 1
                _next.disabled = current >= last
            }
        }
    })()

    const Table = (() => {

        const templates = /*HTML*/
            {
                table: `<table style="margin-top:1rem;">%head%body</table>`,
                thead: `<thead>%tr</thead>`,
                tbody: `<tbody>%tr</tbody>`,
                tr: `<tr>%td</tr>`,
                th: `<th class="%class" data-id="%id" data-order="%order">%content%arrow</th>`,
                td: `<td>%content</td>`
            }

        let _container, _columns

        return class Table {

            constructor(container, columns, sort) {

                _container = container
                _columns = columns

                _container.insertAdjacentHTML('afterbegin', Template.html(templates.table, {
                    head: Template.html(templates.thead, {
                        tr: Template.html(templates.tr, {
                            td: columns.reduce((tr, column, i) => tr += Template.html(templates.th, {
                                content: column.name,
                                class: column.class,
                                id: column.id,
                                order: i === 0 ? 'ASC' : '',
                                arrow: i === 0 ? '↓' : ''
                            }), '')
                        })
                    }),
                    body: Template.html(templates.tbody, {
                        tr: ''
                    })
                }))

                ;[..._container.querySelectorAll(':scope .sortable')].forEach(th => {
                    th.addEventListener('click', ev => {
                        switch (ev.target.dataset.order) {
                            case 'ASC':
                                ev.target.dataset.order = 'DESC'
                                ;[..._container.querySelectorAll(':scope .sortable')].forEach(th => th.innerText = th.innerText.replace('↓', '').replace('↑', ''))
                                ev.target.innerText += '↑'
                                break
                            case 'DESC':
                            default:
                                ev.target.dataset.order = 'ASC'
                                ;[..._container.querySelectorAll(':scope .sortable')].forEach(th => th.innerText = th.innerText.replace('↓', '').replace('↑', ''))
                                ev.target.innerText += '↓'
                        }
                        sort(ev.target.dataset.id, ev.target.dataset.order)
                    })
                })
            }

            update(ev) {
                const rows = ev.detail.rows
                if (!Array.isArray(rows))
                    return

                const tbody = _container.querySelector(':scope tbody')
                if (tbody !== null) {
                    tbody.innerHTML = rows.reduce((tbody, row) => tbody += Template.html(templates.tr, {
                        td: _columns.reduce((tr, column) => tr += Template.html(templates.td, {
                            content: row[column.id]
                        }), '')
                    }), '')
                }
            }
        }
    })()

    class App {

        constructor(id, columns, last, roles, action, nonce) {

            const container = document.getElementById(id)

            this.id = id
            this.nonce = nonce
            this.action = action
            this.current = 1
            this.role = ''
            this.orderBy = ''
            this.order = ''
            this.last = 0
            this.count = 0

            if (typeof container.insertAdjacentHTML !== 'function') {
                throw new Error(`Expected HTMLElement, but got ${container === null ? 'null' : container.constructor.name}`)
            }

            this.table = new Table(container, columns, this.sort.bind(this))
            this.pagination = new Pagination(container, 1, last, this.previous.bind(this), this.next.bind(this))
            this.filter = new Filter(container, [{value: '', text: 'Any'}].concat(roles), this.foo.bind(this))

            on(`${this.id}_update`, ev => (this.table.update(ev), this.pagination.update(ev)))
        }

        async update() {

            const items = await fetch(`${this.action}&page=${this.current}&role=${this.role}&orderBy=${this.orderBy}&order=${this.order}&_ajax_nonce=${this.nonce}`)
                .then(response => response.json())
                .catch(console.error)

            this.last = items.last
            this.count = items.rows.length

            emit('rgbcode_test1_shortcode1_update', items)
        }

        async previous() {
            this.current -= 1
            await this.update()
        }

        async next() {
            this.current += 1
            await this.update()
        }

        async foo() {
            this.current = 1
            this.role = this.filter.value()
            await this.update()
        }

        async sort(orderBy, order) {
            if (this.count > 1 || this.last > 1) {
                this.current = 1
                this.orderBy = orderBy
                this.order = order
                await this.update()
            }
        }
    }

    const on = addEventListener, off = removeEventListener
    const emit = (t, d) => dispatchEvent(new CustomEvent(t, {'detail': d}))
    const {id, roles, columns, last, action, nonce} = rgbcode_test1_shortcode1

    on('load', async () => await new App(id, columns, last, roles, action, nonce).update())
})()