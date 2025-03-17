import * as React from 'react';
import { ActionButton, ProgressCircle, Switch, TooltipTrigger, Tooltip, Link, TextArea } from "@adobe/react-spectrum";
import { TextField } from "@adobe/react-spectrum";
import { Flex } from "@adobe/react-spectrum";
import { Text } from "@adobe/react-spectrum";
import ExportReplayButton from "./ExportReplayButton";
import OpenIn from '@spectrum-icons/workflow/OpenIn';
import Clock from '@spectrum-icons/workflow/Clock';
import Images from '@spectrum-icons/workflow/Images';
import DocumentOutline from '@spectrum-icons/workflow/DocumentOutline';
import { useTranslation } from 'react-i18next';
import path from 'path-browserify';


function DashboardPanel({configData, documentValue, exportSettings, progress, setProgress}) {
    const { t , i18n } = useTranslation();
    const [, forceUpdate] = React.useState({});
    
    const formatTime = () => {
        const hours = Math.floor(documentValue.timeSpent / 3600);
        const minutes = Math.floor((documentValue.timeSpent % 3600) / 60);
        const seconds = documentValue.timeSpent % 60;
        if (hours > 0) {
            return `${hours}${t('h')} ${minutes}${t('m')}`;
        } else if (minutes > 0) {
            return `${minutes}${t('m')} ${seconds}${t('s')}`;
        } else {
            return `${seconds}${t('s')}`;
        }
    }

    return(
        <Flex direction="column" marginY="size-100">
            <Flex direction="row" justifyContent="space-between" marginBottom="size-500">
                <Switch
                    aria-label="Toggle Enabled"
                    isSelected={configData.current.isEnabled}
                    onChange={() => {
                        configData.current.isEnabled = !configData.current.isEnabled;
                        forceUpdate({});
                    }}
                >
                    {configData.current.isEnabled ? t('Enabled') : t('Disabled')}
                </Switch>
                <ExportReplayButton configData={configData} documentValue={documentValue} exportSettings={exportSettings} progress={progress} setProgress={setProgress}/>
            </Flex>
            <Flex direction="column" marginBottom="size-500">
                <Flex direction="row" justifyContent="space-between" marginBottom="size-100">
                    <Flex direction="row">
                        <DocumentOutline size="S" marginEnd="size-100"/>
                        <Text>{t('Document')}</Text>
                    </Flex>
                    <Flex direction="row">
                        {documentValue.id && (
                            <TooltipTrigger delay={0}>
                                <ActionButton
                                    aria-label="Open Current Document Process Image Folder"
                                    onPress={() => {
                                        try {
                                            //@ts-ignore
                                            openLocalPath(path.join(configData.current.processImageFolderPath, documentValue.createTime));
                                        } catch (error) {
                                            alert(error);
                                        }
                                    }}
                                    isDisabled={!documentValue.count}
                                    marginEnd="size-100"
                                    >
                                    <OpenIn />
                                </ActionButton>
                                <Tooltip>{t('Open Process Image Folder')}</Tooltip>
                            </TooltipTrigger>
                        )}
                        <TextField
                            width="size-1200"
                            value={documentValue.id ? documentValue.name : ""}
                            isReadOnly
                        />
                    </Flex>
                </Flex>
                <Flex direction="row" justifyContent="space-between" marginBottom="size-100">
                    <Flex direction="row">
                        <Images size="S" marginEnd="size-100"/>
                        <Text>{t('Image Count')}</Text>
                    </Flex>
                    <Flex direction="row">
                        {documentValue.isGettingImage && (
                            <ProgressCircle 
                                aria-label="Loading…" 
                                isIndeterminate 
                                size="S"
                                alignSelf="center"
                                marginEnd="size-150"
                            />
                        )}
                        <TextField
                            width="size-1200"
                            value={documentValue.id ? documentValue.count : ""}
                            isReadOnly
                        />
                    </Flex>
                </Flex>
                <Flex direction="row" justifyContent="space-between">
                    <Flex direction="row">
                        <Clock size="S" marginEnd="size-100"/>
                        <Text>{t('Time Spent')}</Text>
                    </Flex>
                    <TextField
                        maxWidth="size-1200"
                        value={documentValue.id ? formatTime() : ""}
                        isReadOnly
                    />
                </Flex>
            </Flex>
            <Flex direction="row" justifyContent="end" marginBottom="size-500">
                <Link 
                    onPress={() => {
                        try {
                            //@ts-ignore
                            window.cep.util.openURLInDefaultBrowser("https://github.com/F-know/F_Record")
                        } catch (error) {
                            //pass
                        }
                    }}>
                        GitHub
                </Link>
            </Flex>
        </Flex>
    );
}

export default DashboardPanel;