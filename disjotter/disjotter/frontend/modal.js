define(["require", "base/js/namespace", "base/js/dialog", "./util"], function (require) {
    "use strict";

    const Jupyter = require('base/js/namespace');
    const dialog = require('base/js/dialog');
    const { jsonRequest } = require("./util");

    const formPromise = fetch('/dj/templates/form.html').then(resp => resp.text());

    const formElements = {};
    const buttonElements = {};
    let elms;

    let notebook;
    let currTab = 'build';

    const getElements = () => {
        return {
            imageNameInput: document.getElementById('image-name'),
            baseImageSelector: document.getElementById('base-image'),
            cellSelector: document.getElementById('cell-index'),
            requirementsArea: document.getElementById('requirements-area'),

            runPortInput: document.getElementById('run-port'),

            buildButton: document.getElementById('build-button'),
            runButton: document.getElementById('run-button'),
            statusButton: document.getElementById('status-button'),
            stopButton: document.getElementById('stop-button'),

            cellPreview: document.getElementById('cell-preview'),
            buildOutput: document.getElementById('build-output'),
            containerStatus: document.getElementById('container-status'),

            kernelSpecific: document.getElementById('kernel-specific')
        }
    }

    const switchTab = async (newTab) => {
        console.log('switching', newTab);

        Object.keys(formElements).forEach(k => {
            formElements[k].classList.add('hide');
        });

        formElements[newTab].classList.remove('hide');

        currTab = newTab;
    };

    const setCellSelectOptions = () => {
        // Allow the user to only select code cells.
        Jupyter.notebook.get_cells()
            .map((cell, idx) => cell.cell_type == 'code' ? idx : null)
            .filter(idx => idx !== null)
            .forEach(idx => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.innerHTML = `Cell ${idx}`

                elms.cellSelector.appendChild(opt);
            })

        elms.cellSelector.onchange = (e) => {
            const idx = Number(elms.cellSelector.value)
            const cellPreviewElm = Jupyter.notebook.get_cell(idx).output_area.wrapper[0];
            const outputElm = cellPreviewElm.getElementsByClassName('output_subarea')[0];

            if (outputElm) {
                elms.cellPreview.innerHTML = outputElm.innerHTML;
            } else {
                elms.cellPreview.innerHTML = '<p>Output not rendered.</p>';
            }
        }

        elms.cellSelector.onchange(null);
    }

    const handlebuildButtonClick = async (e) => {
        e.preventDefault();

        elms.buildButton.value = 'Building...';
        elms.buildButton.disabled = true;
        elms.buildOutput.value = '';

        const res = await jsonRequest('POST', `/dj/notebook/${notebook.path}/build`, {
            imageName: elms.imageNameInput.value,
            baseImage: elms.baseImageSelector.value,
            cellIndex: elms.cellSelector.value,
            requirements: elms.requirementsArea.value,
            variables: {}
        })

        if (res.status !== 200) {
            return alert(await res.text())
        }

        const data = await res.json()

        elms.buildButton.value = 'Build';
        elms.buildButton.disabled = false;
        elms.buildOutput.value = data['logs']
    }

    const onOpen = async () => {
        console.log('Opening.')

        notebook = await Jupyter.notebook.save_notebook();
        
        buttonElements['build'] = document.getElementById("btn-tab-build");
        buttonElements['run'] = document.getElementById("btn-tab-run");
        buttonElements['validate'] = document.getElementById("btn-tab-validate");

        formElements['build'] = document.getElementById("disjotter-build");
        formElements['run'] = document.getElementById("disjotter-run");
        formElements['validate'] = document.getElementById("disjotter-validate");

        Object.keys(buttonElements).forEach(k => {
            buttonElements[k].onclick = () => switchTab(k);
        })

        switchTab(currTab);

        elms = getElements();

        setCellSelectOptions(elms.cellSelector, elms.cellPreview);

        elms.buildButton.onclick = handlebuildButtonClick;
    }
    
    return {
        openFormHandler: async () => {
            const formHtml = await formPromise;
    
            dialog.modal({title: 'DisJotter', 
                keyboard_manager: Jupyter.keyboard_manager, 
                body: () => formHtml, 
                open: onOpen
            });
        }
    }
});