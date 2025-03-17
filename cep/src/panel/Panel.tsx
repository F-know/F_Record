import * as React from 'react';
import { Button, defaultTheme, Flex, Item, Provider, Switch, TabList, TabPanels, Tabs, Text, lightTheme, darkTheme, FileTrigger, TextField, Picker, ActionButton, Heading, ButtonGroup, DialogTrigger, Dialog, Content, Divider, Header, ToastContainer, ToastQueue } from '@adobe/react-spectrum';
import Settings from '@spectrum-icons/workflow/Settings';
import MovieCamera from '@spectrum-icons/workflow/MovieCamera';
import path from 'path-browserify';
import DashboardPanel from './DashboardPanel';
import SettingsPanel from './SettingsPanel';
import { useTranslation } from 'react-i18next';
import { F_Record_Dir, configDataFilePath, nowDocumentFilePath, documentValueFolderPath } from './constants';


function Panel() {
    const [, forceUpdate] = React.useState({});

    const { t , i18n } = useTranslation();

    interface ConfigData {
        [key: string]: any;
    }
    const configData = React.useRef<ConfigData>({
        isEnabled: false,
        processImageFolderPath: path.join(F_Record_Dir, "processImages"),
        resolution: "1080",
        quality: "50",
        idleTimeout: "1",
        language: "cn",
        lastExportTime: null,
    });

    interface DocumentValue {
        [key: string]: any;
    }
    const defaultDocumentValue: DocumentValue = {
        id: null,
        createTime: null,
        name: null,
        isGettingImage: null,
        bounds: null,
        count: null,
        timeSpent: null,
        lastModifiedTime: null,
    }
    const [documentValue, setDocumentValue] = React.useState<DocumentValue>(defaultDocumentValue);

    const loadConfigData = () => {
        //@ts-ignore
        if (!isExist(F_Record_Dir)) {
            //@ts-ignore
            createDir(F_Record_Dir);
        }
        //@ts-ignore
        if (isExist(configDataFilePath)) {
            configData.current = {
                ...configData.current,
                //@ts-ignore
                ...JSON.parse(readFile(configDataFilePath))
            }
        }
        //@ts-ignore
        const configDataFiles = readDir(F_Record_Dir);
        for (const file of configDataFiles) {
            if (file.startsWith('configData.json.')) {
                //@ts-ignore
                unlinkFile(path.join(F_Record_Dir, file));
            }
        }
        i18n.changeLanguage(configData.current.language);
        forceUpdate({});
    }

    const persistentVisiblePanel = () => {
        //@ts-ignore;
        const cs = new CSInterface();
        const extensionId = cs.getExtensionID();
        const appId = cs.getApplicationID();
        //@ts-ignore;
        const event = new CSEvent();
        event.type = "com.adobe.PhotoshopPersistent";
        event.appId = appId;
        event.extensionId = extensionId;
        event.scope = "APPLICATION";
        event.data = {};
        cs.dispatchEvent(event);
    }

    const saveConfigData = () => {
        //@ts-ignore
        if (!isExist(F_Record_Dir)) {
            //@ts-ignore
            createDir(F_Record_Dir);
        }
        //@ts-ignore
        writeFile(configDataFilePath, JSON.stringify(configData.current, null, 2));
    }
    

    const updateNowDocument = () => {
        let nowDocumentValue = defaultDocumentValue;
        //@ts-ignore
        if (!isExist(nowDocumentFilePath)){
            setDocumentValue(defaultDocumentValue);
            return;
        }
        nowDocumentValue ={
            ...nowDocumentValue,
            //@ts-ignore
            ...JSON.parse(readFile(nowDocumentFilePath))
        }
        const nowDocumentValueFilePath = path.join(documentValueFolderPath, `${nowDocumentValue.createTime}.json`);
        //@ts-ignore
        if (!isExist(nowDocumentValueFilePath)){
            setDocumentValue(defaultDocumentValue);
            return;
        }
        nowDocumentValue = {
            ...nowDocumentValue,
            //@ts-ignore
            ...JSON.parse(readFile(nowDocumentValueFilePath))
        }
        if (nowDocumentValue.id) {
            const imageFolderPath = path.join(configData.current.processImageFolderPath, nowDocumentValue.createTime);
            //@ts-ignore
            if (isExist(imageFolderPath)) {
                //@ts-ignore
                nowDocumentValue.count = readDir(imageFolderPath).length;
            } else {
                nowDocumentValue.count = 0;
            }
        }
        setDocumentValue(nowDocumentValue);
    }

    const loopUpdateNowDocument = async () => {
        //@ts-ignore
        if (isExist(nowDocumentFilePath)) {
            //@ts-ignore
            unlinkFile(nowDocumentFilePath);
        }
        while (true) {
            try {   
                updateNowDocument();
            } catch (error) {
                //pass
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    const loopSaveConfigData = async () => {
        while (true) {
            try {
                saveConfigData();
            } catch (error) {
                //pass
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }


    const exportSettings = React.useRef({
        isExporting: false,
        aspectRatio: "0",
        duration: "0",
        savePath: null,
    });

    const [progress, setProgress] = React.useState({
        status: "",
        percent: 0,
    });

    const loopUpdateLastExportTime = async () => {
        while (true) {
            if (exportSettings.current.isExporting) {
                configData.current.lastExportTime = new Date().getTime();
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    React.useEffect(() => {
        try {
            // persistentVisiblePanel();
            loadConfigData();
            loopSaveConfigData();
            loopUpdateNowDocument();
            loopUpdateLastExportTime();
        } catch (error) {
            ToastQueue.negative(t('Error'), {
                actionLabel: t('Details'),
                onAction: () => {
                    //@ts-ignore
                    cs.evalScript("$.f_record.showError('" + encodeURIComponent(JSON.stringify(error, null, 2)) + "')");
                }
            });
        }
    }, []);

    return (
        <Provider theme={darkTheme}>
            <ToastContainer placement="bottom" />
            <Flex justifyContent="center" marginX="size-200">
                <Tabs aria-label="Tab of Panel">
                    <TabList>
                        <Item key="Dashboard Panel">
                            <MovieCamera />
                            <Text>{t('Dashboard')}</Text>
                        </Item>
                        <Item key="Settings Panel">
                            <Settings />
                            <Text>{t('Settings')}</Text>
                        </Item>
                    </TabList>
                    <TabPanels>
                        <Item key="Dashboard Panel">
                            <DashboardPanel configData={configData} documentValue={documentValue} exportSettings={exportSettings} progress={progress} setProgress={setProgress}/>
                        </Item>
                        <Item key="Settings Panel">
                            <SettingsPanel configData={configData} documentValue={documentValue}/>
                        </Item>
                    </TabPanels>
                </Tabs>
            </Flex>
        </Provider>
    );
};

export default Panel; 